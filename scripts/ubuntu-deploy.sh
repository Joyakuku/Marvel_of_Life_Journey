#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-check}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env}"
BACKEND_DIR="${BACKEND_DIR:-${PROJECT_DIR}/backend}"
FRONTEND_DIST="${FRONTEND_DIST:-${PROJECT_DIR}/dist}"
APP_NAME="${APP_NAME:-marvel-of-life-journey}"
SERVICE_NAME="${SERVICE_NAME:-${APP_NAME}}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-${APP_NAME}}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SERVER_NAME="${SERVER_NAME:-${DOMAIN:-_}}"
ENABLE_SSL="${ENABLE_SSL:-0}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
INSTALL_MYSQL="${INSTALL_MYSQL:-0}"
INIT_DB="${INIT_DB:-1}"
DISABLE_DEFAULT_SITE="${DISABLE_DEFAULT_SITE:-1}"

log() {
  printf '[INFO] %s\n' "$*"
}

warn() {
  printf '[WARN] %s\n' "$*" >&2
}

die() {
  printf '[ERROR] %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
用法:
  bash scripts/ubuntu-deploy.sh check
  sudo SERVER_NAME=example.com bash scripts/ubuntu-deploy.sh deploy

常用环境变量:
  ENV_FILE=.env 路径，默认项目根目录 .env
  SERVER_NAME=Nginx server_name，默认 _
  RUN_USER=运行后端服务的系统用户，默认项目目录所有者或 sudo 用户
  NODE_MAJOR=安装的 Node.js 主版本，默认 20
  INSTALL_MYSQL=1 时安装 mysql-server，默认 0
  INIT_DB=1 时导入 database/schema.sql，默认 1
  ENABLE_SSL=1 时尝试用 certbot 签发证书，默认 0
  LETSENCRYPT_EMAIL=启用 SSL 时必须提供
  DISABLE_DEFAULT_SITE=1 时禁用 Nginx 默认站点，默认 1

说明:
  1. 脚本假设仓库代码已经在服务器上。
  2. 后端运行时读取的是项目根目录 .env，不是 backend/.env.production。
  3. 如果前后端同域部署，.env 中的 VITE_API_BASE_URL 可以留空。
EOF
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die 'deploy 模式请使用 sudo 或 root 执行'
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

load_os_release() {
  [[ -f /etc/os-release ]] || die '无法识别系统，缺少 /etc/os-release'
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == 'ubuntu' ]] || die "当前系统为 ${ID:-unknown}，脚本仅适配 Ubuntu"
}

infer_run_user() {
  if [[ -n "${RUN_USER:-}" ]]; then
    return
  fi

  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != 'root' ]]; then
    RUN_USER="${SUDO_USER}"
    return
  fi

  local owner
  owner="$(stat -c '%U' "${PROJECT_DIR}" 2>/dev/null || true)"
  if [[ -n "${owner}" && "${owner}" != 'UNKNOWN' ]]; then
    RUN_USER="${owner}"
    return
  fi

  RUN_USER="$(id -un)"
}

run_as_user() {
  local cmd="$1"
  if [[ "$(id -un)" == "${RUN_USER}" ]]; then
    bash -lc "${cmd}"
  else
    sudo -u "${RUN_USER}" -H bash -lc "${cmd}"
  fi
}

load_app_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  fi

  APP_PORT="${PORT:-3001}"
  DB_NAME="${DB_NAME:-survey_db}"
  DISABLE_DB_FLAG="$(printf '%s' "${DISABLE_DB:-false}" | tr '[:upper:]' '[:lower:]')"
}

version_or_missing() {
  local cmd="$1"
  local version_cmd="$2"
  if command_exists "${cmd}"; then
    bash -lc "${version_cmd}" 2>/dev/null | head -n 1
  else
    printf 'missing\n'
  fi
}

show_path_status() {
  local target="$1"
  if [[ -e "${target}" ]]; then
    printf 'OK    %s\n' "${target}"
  else
    printf 'MISS  %s\n' "${target}"
  fi
}

check_port() {
  local port="$1"
  if command_exists ss && ss -ltn | grep -q ":${port} "; then
    printf 'USED  %s\n' "${port}"
  else
    printf 'FREE  %s\n' "${port}"
  fi
}

check_required_var() {
  local name="$1"
  local required="$2"
  local value="${!name:-}"
  if [[ -n "${value}" ]]; then
    printf 'SET   %s\n' "${name}"
    return
  fi
  if [[ "${required}" == '1' ]]; then
    printf 'MISS  %s\n' "${name}"
  else
    printf 'OPT   %s\n' "${name}"
  fi
}

validate_deploy_inputs() {
  [[ -f "${ENV_FILE}" ]] || die "未找到 ${ENV_FILE}，请先根据 .env.example 创建"

  local missing=0
  local required_vars=(PORT NODE_ENV CORS_ORIGIN ADMIN_TOKEN)

  if [[ "${DISABLE_DB_FLAG}" != 'true' ]]; then
    required_vars+=(DB_HOST DB_PORT DB_USER DB_NAME)
  fi

  for name in "${required_vars[@]}"; do
    if [[ -z "${!name:-}" ]]; then
      warn "缺少环境变量: ${name}"
      missing=1
    fi
  done

  if [[ "${ENABLE_SSL}" == '1' ]]; then
    [[ "${SERVER_NAME}" != '_' ]] || die '启用 SSL 时必须提供 SERVER_NAME'
    [[ -n "${LETSENCRYPT_EMAIL}" ]] || die '启用 SSL 时必须提供 LETSENCRYPT_EMAIL'
    [[ "${SERVER_NAME}" != *' '* ]] || die '自动 SSL 仅支持单个域名，请将 SERVER_NAME 设为单个域名'
  fi

  [[ "${missing}" -eq 0 ]] || die '环境变量不完整，部署终止'
}

install_nodejs() {
  local need_install=0
  if ! command_exists node; then
    need_install=1
  else
    local current_major
    current_major="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
    if [[ "${current_major}" -lt 18 ]]; then
      need_install=1
    fi
  fi

  if [[ "${need_install}" -eq 0 ]]; then
    log "Node.js 已安装: $(node -v)"
    return
  fi

  log "安装 Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
}

install_system_packages() {
  log '安装系统依赖'
  apt-get update -y
  apt-get install -y curl ca-certificates gnupg lsb-release software-properties-common build-essential nginx default-mysql-client

  if [[ "${INSTALL_MYSQL}" == '1' ]]; then
    apt-get install -y mysql-server
    systemctl enable --now mysql
  fi

  if [[ "${ENABLE_SSL}" == '1' ]]; then
    apt-get install -y certbot python3-certbot-nginx
  fi

  install_nodejs
}

npm_install_dir() {
  local dir="$1"
  if [[ -f "${dir}/package-lock.json" ]]; then
    run_as_user "cd \"${dir}\" && npm ci"
  else
    run_as_user "cd \"${dir}\" && npm install"
  fi
}

prepare_app() {
  log '安装项目依赖'
  npm_install_dir "${PROJECT_DIR}"
  npm_install_dir "${BACKEND_DIR}"

  log '准备上传目录'
  install -d -m 0755 -o "${RUN_USER}" -g "${RUN_USER}" "${BACKEND_DIR}/uploads/blessings/audio"

  log '构建前端'
  run_as_user "cd \"${PROJECT_DIR}\" && npm run build"
}

init_database() {
  if [[ "${INIT_DB}" != '1' ]]; then
    log '已跳过数据库初始化'
    return
  fi

  if [[ "${DISABLE_DB_FLAG}" == 'true' ]]; then
    warn 'DISABLE_DB=true，已跳过数据库初始化'
    return
  fi

  command_exists mysql || die '缺少 mysql 客户端，无法初始化数据库'

  local schema_file temp_schema
  schema_file="${PROJECT_DIR}/database/schema.sql"
  [[ -f "${schema_file}" ]] || die "未找到 ${schema_file}"

  temp_schema="$(mktemp)"
  sed \
    -e "s/CREATE DATABASE IF NOT EXISTS survey_db CHARACTER SET/CREATE DATABASE IF NOT EXISTS \\`${DB_NAME}\\` CHARACTER SET/" \
    -e "s/USE survey_db;/USE \\`${DB_NAME}\\`;/" \
    "${schema_file}" > "${temp_schema}"

  log '初始化数据库结构'
  if [[ -n "${DB_PASSWORD:-}" ]]; then
    MYSQL_PWD="${DB_PASSWORD}" mysql --protocol=tcp -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" < "${temp_schema}"
  else
    mysql --protocol=tcp -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" < "${temp_schema}"
  fi

  rm -f "${temp_schema}"
}

write_systemd_service() {
  local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
  local node_bin
  node_bin="$(command -v node)"
  [[ -n "${node_bin}" ]] || die '未找到 node 可执行文件'

  cat > "${service_file}" <<EOF
[Unit]
Description=${APP_NAME} backend service
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${BACKEND_DIR}
ExecStart=${node_bin} server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"
}

write_nginx_config() {
  local site_file="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
  local primary_name
  primary_name="${SERVER_NAME%% *}"

  cat > "${site_file}" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${FRONTEND_DIST};
    index index.html;

    client_max_body_size 10m;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:${APP_PORT}/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  ln -sf "${site_file}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

  if [[ "${DISABLE_DEFAULT_SITE}" == '1' ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  if [[ "${ENABLE_SSL}" == '1' ]]; then
    certbot --nginx -d "${primary_name}" --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" --redirect
    systemctl reload nginx
  fi
}

run_health_checks() {
  local primary_name
  primary_name="${SERVER_NAME%% *}"

  log '执行健康检查'
  curl -fsS "http://127.0.0.1:${APP_PORT}/health" >/dev/null
  curl -fsS -H "Host: ${primary_name}" http://127.0.0.1/ >/dev/null
}

show_check_report() {
  load_os_release
  infer_run_user
  load_app_env

  printf '系统: %s %s\n' "${NAME:-Ubuntu}" "${VERSION_ID:-unknown}"
  printf '项目目录: %s\n' "${PROJECT_DIR}"
  printf '后端目录: %s\n' "${BACKEND_DIR}"
  printf '前端产物目录: %s\n' "${FRONTEND_DIST}"
  printf '运行用户: %s\n' "${RUN_USER}"
  printf '服务器名: %s\n' "${SERVER_NAME}"
  printf '\n文件检查:\n'
  show_path_status "${PROJECT_DIR}/package.json"
  show_path_status "${BACKEND_DIR}/package.json"
  show_path_status "${PROJECT_DIR}/database/schema.sql"
  show_path_status "${ENV_FILE}"

  if [[ -f "${BACKEND_DIR}/.env.production" ]]; then
    warn '发现 backend/.env.production，但后端运行时读取的是项目根目录 .env'
  fi

  printf '\n命令检查:\n'
  printf 'node   %s\n' "$(version_or_missing node 'node -v')"
  printf 'npm    %s\n' "$(version_or_missing npm 'npm -v')"
  printf 'nginx  %s\n' "$(version_or_missing nginx 'nginx -v 2>&1')"
  printf 'mysql  %s\n' "$(version_or_missing mysql 'mysql --version')"
  printf 'curl   %s\n' "$(version_or_missing curl 'curl --version')"

  printf '\n端口检查:\n'
  check_port 80
  check_port 443
  check_port "${APP_PORT}"

  printf '\n环境变量检查:\n'
  check_required_var PORT 1
  check_required_var NODE_ENV 1
  check_required_var CORS_ORIGIN 1
  check_required_var ADMIN_TOKEN 1
  if [[ "${DISABLE_DB_FLAG}" == 'true' ]]; then
    printf 'SKIP  DB_* (DISABLE_DB=true)\n'
  else
    check_required_var DB_HOST 1
    check_required_var DB_PORT 1
    check_required_var DB_USER 1
    check_required_var DB_PASSWORD 0
    check_required_var DB_NAME 1
  fi
  check_required_var PUBLIC_BASE 0
  check_required_var VITE_API_BASE_URL 0
  check_required_var DS_API_KEY 0
  check_required_var DS_API_URL 0

  if [[ "${DISABLE_DB_FLAG}" != 'true' && -f "${ENV_FILE}" && -n "${DB_HOST:-}" && -n "${DB_PORT:-}" && -n "${DB_USER:-}" ]] && command_exists mysql; then
    printf '\n数据库连通性:\n'
    if [[ -n "${DB_PASSWORD:-}" ]]; then
      if MYSQL_PWD="${DB_PASSWORD}" mysql --protocol=tcp -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -e 'SELECT 1' >/dev/null 2>&1; then
        printf 'OK    mysql connection\n'
      else
        printf 'FAIL  mysql connection\n'
      fi
    else
      if mysql --protocol=tcp -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -e 'SELECT 1' >/dev/null 2>&1; then
        printf 'OK    mysql connection\n'
      else
        printf 'FAIL  mysql connection\n'
      fi
    fi
  fi
}

deploy() {
  require_root
  load_os_release
  infer_run_user
  load_app_env
  validate_deploy_inputs

  install_system_packages
  prepare_app
  init_database
  write_systemd_service
  write_nginx_config
  run_health_checks

  log '部署完成'
  log "后端服务: systemctl status ${SERVICE_NAME}"
  log 'Nginx 状态: systemctl status nginx'
  log "健康检查: curl http://127.0.0.1:${APP_PORT}/health"
}

case "${ACTION}" in
  check)
    show_check_report
    ;;
  deploy)
    deploy
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
