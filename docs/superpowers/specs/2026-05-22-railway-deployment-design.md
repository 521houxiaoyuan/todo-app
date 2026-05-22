# Railway 一体部署设计文档

**日期**：2026-05-22
**目标**：将 Vue 3 前端 + Express 后端 + MySQL 免费部署到 Railway，单一可访问 URL

---

## 架构概览

```
用户浏览器
    │
    ▼
Railway Service（Express）
    ├── GET /api/*   → Express 路由处理
    ├── GET /*       → 返回 frontend/dist/index.html（SPA fallback）
    └── static       → frontend/dist/ 静态资源
         │
         └── Railway MySQL Plugin
               └── todo_app 数据库
```

Express 同时承担两个职责：API 服务器 + 静态文件服务器。前后端同域，无需 CORS。

---

## 代码改动

### 1. `frontend/src/api/index.js`

将 `baseURL` 从绝对路径改为相对路径：

```js
// 改前
baseURL: 'http://localhost:3000/api'

// 改后
baseURL: '/api'
```

生产环境前后端同域，相对路径自动指向正确地址。

### 2. `frontend/vite.config.js`

添加 `server.proxy`，本地开发时将 `/api` 请求转发到后端：

```js
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

本地开发流程不变：`npm run dev`（前端）+ `node backend/src/index.js`（后端）分别启动。

### 3. `backend/src/index.js`

在路由注册前添加静态文件托管和 SPA fallback：

```js
const path = require('path');

// 托管前端打包产物
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// SPA fallback：非 /api 路由返回 index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

CORS 中间件保留（本地开发仍需要），生产环境 `CORS_ORIGIN` 不设即可。

### 4. `backend/src/db.js`

Railway MySQL Plugin 注入的环境变量名与现有代码不一致，需要在 Railway Service 的 Variables 里添加映射变量（见下方环境变量配置），db.js 代码本身不改。

---

## Railway 部署配置

### Service 设置

- **Build Command**：`npm run build`（root package.json 已有，执行前端打包 + 后端安装依赖）
- **Start Command**：`npm start`（root package.json 已有，执行 `node backend/src/index.js`）
- **Node 版本**：Railway 默认检测 `engines.node`，root package.json 已声明 `>=18.0.0`

### MySQL Plugin

在同一 Railway Project 里添加 MySQL Plugin。Plugin 创建后自动注入以下变量到 Service：

| Railway 注入变量 | 说明 |
|---|---|
| `MYSQLHOST` | 数据库主机 |
| `MYSQLPORT` | 端口（通常 3306） |
| `MYSQLUSER` | 用户名 |
| `MYSQLPASSWORD` | 密码 |
| `MYSQLDATABASE` | 数据库名 |

### Service 环境变量（手动添加）

在 Railway Service → Variables 里添加：

| 变量名 | 值 |
|---|---|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `JWT_SECRET` | 随机字符串（32 位以上） |
| `NODE_ENV` | `production` |

Railway 支持 `${{PluginName.VAR}}` 语法引用 Plugin 变量，避免手动复制粘贴。

### 数据库初始化

部署成功后，在 Railway MySQL Plugin 页面 → Data 标签页，执行 `backend/src/sql/init.sql` 的内容建表。只需执行一次。

---

## 本地开发流程（部署后不变）

```bash
# 终端 1：启动后端
cd backend && node src/index.js

# 终端 2：启动前端（Vite proxy 转发 /api 到 localhost:3000）
cd frontend && npm run dev
```

访问 `http://localhost:5173`，行为与之前完全一致。

---

## 部署后验证

1. Railway 分配的域名（如 `xxx.railway.app`）能打开登录页
2. 注册 / 登录功能正常
3. Todo 增删改查正常
4. 刷新页面不 404（SPA fallback 生效）
