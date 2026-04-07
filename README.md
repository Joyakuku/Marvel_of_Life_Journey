# vue-survey-app（问卷系统 + 摇一摇祝福）

一个基于 **Vue 3 + Vite** 的前端项目，配套 **Express + MySQL** 后端 API。包含：

- 问卷填写/提交/结果展示
- 管理端（统计与数据管理）
- “摇一摇”公益祝福模块（祝福发布、随机祝福、点赞/赠章、进度）

## 目录结构

- `src/`：前端（Vue 3）
- `backend/`：后端（Express）
- `database/`：数据库结构（`schema.sql`）
- `dist/`：前端构建产物（`npm run build` 生成）

## 环境要求

- Node.js：建议 **>= 18**（最低兼容见 `backend/package.json` 为 `>= 14`）
- MySQL：**5.7+** 或 **8.x**（需要支持 `JSON` 字段）

## 安装依赖

前端依赖（在项目根目录执行）：

```bash
npm install
```

后端依赖（在 `backend/` 目录执行）：

```bash
cd backend
npm install
```

## 环境变量（重要）

后端启动时会从 **项目根目录** 读取 `.env`（见 `backend/server.js`）。请在本地准备根目录 `.env`，至少包含下面变量（不要把真实密钥写进公开仓库）：

- **数据库**
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`（默认 `survey_db`）
- **后端服务**
  - `PORT`（默认 `3001`）
  - `NODE_ENV`（`development`/`production`）
  - `CORS_ORIGIN`（逗号分隔白名单，如 `http://localhost:3000`）
- **AI 解析（如启用）**
  - `DS_API_KEY`
  - `DS_API_URL`
- **管理员**
  - `ADMIN_TOKEN`（管理接口需要 `X-Admin-Token` 请求头）

可选：

- `DISABLE_DB=true`：启用无数据库模式（后端将跳过数据库检查/初始化，适合只验证接口存活与前端联调）

## 数据库初始化

本项目使用 `database/schema.sql` 初始化数据库与表结构。

> 注意：后端服务启动时会显式加载**根目录** `.env`；但数据库初始化脚本（`backend/utils/initDatabase.js`）是 `dotenv` 默认加载方式，通常会读取**脚本执行目录**下的 `.env`（也就是 `backend/.env`）。
> 因此如果你只在根目录放了 `.env`，建议使用下面“方式 B-2”，确保脚本读取到正确的环境变量。

方式 A：直接在 MySQL 中执行（推荐）

```sql
source database/schema.sql;
```

方式 B-1：使用后端脚本（在 `backend/` 下执行，要求 `backend/.env` 存在并含 DB_* 配置）

```bash
cd backend
npm run init-db
```

方式 B-2（推荐）：显式指定读取根目录 `.env`（PowerShell）

```powershell
cd backend
node -r dotenv/config utils/initDatabase.js dotenv_config_path=../.env
```

## 本地开发启动

### 1) 启动后端（端口 3001）

```bash
cd backend
npm run dev
```

启动后可用：

- `GET /health`：健康检查（含数据库连接状态）
- `GET /`：API 概览

### 2) 启动前端（端口 3000）

在项目根目录：

```bash
npm run dev
```

#### 前端 API 代理说明

开发时前端会将 `/api` 与 `/health` 代理到后端（见 `vite.config.js`）。可通过环境变量切换代理目标：

```bash
set VITE_PROXY_TARGET=http://localhost:3001
npm run dev
```

（PowerShell 也可使用：`$env:VITE_PROXY_TARGET="http://localhost:3001"; npm run dev`）

## 构建与预览

构建前端（根目录）：

```bash
npm run build
```

本地预览构建产物（根目录）：

```bash
npm run preview
```

## 代码规范

前端 lint（根目录）：

```bash
npm run lint
```

## 常见问题（FAQ）

### 1) 后端 CORS 报错

确认根目录 `.env` 的 `CORS_ORIGIN` 包含你的前端地址（如 `http://localhost:3000`），多个来源用英文逗号分隔。

### 2) 数据库连不上

- 检查 MySQL 是否启动、账号密码是否正确
- 确认 `DB_HOST/DB_PORT` 可访问
- 确认已执行 `database/schema.sql`

### 3) 管理接口提示未授权

管理相关接口需要请求头 `X-Admin-Token`，其值来自根目录 `.env` 的 `ADMIN_TOKEN`。

