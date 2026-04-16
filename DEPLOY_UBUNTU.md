# Ubuntu 部署说明

## 适用方式

- 服务器系统：Ubuntu
- 部署形态：`Nginx + Node.js + systemd + MySQL`
- 假设代码已经上传或 `git clone` 到服务器

## 先准备 `.env`

后端运行时读取的是项目根目录 `.env`。

```bash
cp .env.example .env
vim .env
```

最少要填这些值：

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`
- `NODE_ENV=production`
- `CORS_ORIGIN`
- `ADMIN_TOKEN`

建议：

- 同域部署时，将 `VITE_API_BASE_URL` 留空
- 使用域名时，设置 `PUBLIC_BASE=https://你的域名`

## 一键检测

```bash
bash scripts/ubuntu-deploy.sh check
```

这个模式会检查：

- Ubuntu 版本
- 项目关键文件是否存在
- `node`、`npm`、`nginx`、`mysql` 是否已安装
- `80`、`443`、`${PORT}` 端口占用情况
- `.env` 是否存在以及关键变量是否已填写
- 数据库是否可连通

## 一键部署

基础部署：

```bash
sudo SERVER_NAME=example.com bash scripts/ubuntu-deploy.sh deploy
```

如果要顺便安装本机 MySQL：

```bash
sudo SERVER_NAME=example.com INSTALL_MYSQL=1 bash scripts/ubuntu-deploy.sh deploy
```

如果要自动申请 HTTPS 证书：

```bash
sudo SERVER_NAME=example.com ENABLE_SSL=1 LETSENCRYPT_EMAIL=ops@example.com bash scripts/ubuntu-deploy.sh deploy
```

## 脚本会做什么

1. 安装系统依赖：`nginx`、`curl`、`default-mysql-client`、`build-essential`
2. 安装 Node.js（版本不足时安装 `20.x`）
3. 安装前后端依赖
4. 构建前端 `dist/`
5. 导入 `database/schema.sql`
6. 生成 `systemd` 服务并启动后端
7. 写入 Nginx 站点配置并重载
8. 执行本机健康检查

## 部署后常用命令

查看后端服务状态：

```bash
systemctl status marvel-of-life-journey
```

查看后端日志：

```bash
journalctl -u marvel-of-life-journey -n 200 --no-pager
```

查看 Nginx 状态：

```bash
systemctl status nginx
```

本机健康检查：

```bash
curl http://127.0.0.1:3001/health
```

## 可选环境变量

- `RUN_USER`：后端服务运行用户，默认当前部署用户
- `ENV_FILE`：自定义 `.env` 路径
- `NODE_MAJOR`：默认 `20`
- `INIT_DB=0`：跳过数据库初始化
- `DISABLE_DEFAULT_SITE=0`：保留 Nginx 默认站点

## 注意

- 脚本不会帮你上传代码，默认你已经在服务器上拿到了仓库
- 如果你已经有自己的 Nginx 站点，请先确认 `SERVER_NAME` 不冲突
- 项目实际使用的是根目录 `.env`，不是 `backend/.env.production`
