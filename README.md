# AutoProvider（开源版）

一个包含 **前端（Vite + Vue 3）**、**后端（Node.js + Express）** 与 **文件解析服务（Python + Flask）** 的单仓项目，用于提供项目/会话管理、模型配置与文件上传解析等能力。

> 提示：本仓库用于开源发布，务必按下文「安全与密钥」配置，避免把 API Key/数据库密码提交到 Git 历史中。

## 功能概览

- **前端 Web UI**：项目创建/会话交互/文件上传与解析状态展示
- **后端 API**（`/api/v1`）：用户、项目、会话、规则、系统信息、更新日志、模型配置等模块
- **文件上传解析**：文档解析（PDF/DOCX/PPT 等）+ 图片识别（视觉模型）+ 结果入库

## 技术栈

- **Frontend**：Vue 3、Vite、TypeScript、TailwindCSS、Pinia
- **Backend**：Node.js、Express、MySQL、Redis
- **Parser Service**：Python 3.8+、Flask

## 目录结构

```text
opensource/
  frontend/autoprovider/              # 前端（Vite + Vue3）
  backend/autoprovider/               # 后端（Express）
  backend/autoprovider/utils/fileparse/ # Python 文件解析服务（Flask）
```

## 快速开始（本地开发）

### 0) 前置依赖

- Node.js：建议 **20+**（前端要求 `^20.19.0 || >=22.12.0`）
- Python：**3.8+**
- MySQL、Redis：用于后端数据与缓存

### 1) 启动 Python 文件解析服务（可选，但文件上传解析需要）

```bash
cd backend/autoprovider/utils/fileparse
pip install -r requirements.txt
python server.py
```

默认监听：`http://localhost:5000`

### 2) 启动后端（Node.js）

```bash
cd backend/autoprovider
npm install
node app.js
```

默认监听：`http://localhost:3019`（API 前缀：`/api/v1`）

### 3) 启动前端（Vite）

```bash
cd frontend/autoprovider
npm install
npm run dev
```

默认访问：`http://localhost:5173`

## 配置说明

### 前端环境变量（可选）

在 `frontend/autoprovider/.env` 中配置：

```env
# Python 文件解析服务地址
VITE_PYTHON_API_BASE_URL=http://localhost:5000
VITE_PYTHON_API_VERSION=/api/v1
```

### 后端环境变量（推荐用 .env）

后端会按优先级加载：`.env` → `.env.production` / `.env.development`（见 `backend/autoprovider/app.js`）。

常用变量（节选）：

- **数据库**：`DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
- **Redis**：`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB`
- **项目路径**：`PROJECTS_BASE_PATH`（用于项目工作目录落盘位置）
- **部署/容器（可选）**：`DOKPLOY_BASE_URL` / `DOKPLOY_API_KEY`、`DOCKER_HOST` / `DOCKER_SOCKET` 等

数据库结构可参考并导入：`backend/autoprovider/db/db.sql`

## 安全与密钥（开源必读）

- **不要提交任何密钥/密码**：包括 LLM API Key、数据库密码、对象存储密钥等。
- 本仓库已在顶层 `.gitignore` 中忽略以下文件（用于避免把敏感信息提交到仓库）：
  - `backend/autoprovider/config/llm-config.json`（模型配置缓存，可能含 API Key）
  - `backend/autoprovider/config/runtime-config.json`（运行态配置，可能含密码）
- 如果你曾经把密钥提交到 Git：请**立刻轮换密钥**，并清理 Git 历史（仅删除文件不等于安全）。

## 常见问题

- **前端“发送/创建项目”按钮不可用**：通常是文件仍在上传/解析中或存在解析失败文件（详见 `frontend/autoprovider/QUICK_START.md`）。
- **上传解析失败**：确认 Python 服务已启动、前端配置了正确的 Python API 地址，并检查服务端日志。

## 贡献

欢迎提交 Issue / PR。建议在 PR 描述中包含：

- 变更动机与影响范围
- 复现步骤（如修复 Bug）
- 截图/日志（如涉及 UI/接口）

## License

本项目采用 **GNU AGPLv3** 开源协议，详见 `LICENSE`。
