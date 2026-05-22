# Railway 一体部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Vue 3 + Express + MySQL 项目部署到 Railway，Express 同时托管前端静态文件，通过单一 URL 对外访问。

**Architecture:** Express 在生产环境 serve `frontend/dist` 静态文件，所有非 `/api` 路由返回 `index.html` 实现 SPA fallback。前端 API 请求改为相对路径 `/api`，本地开发通过 Vite proxy 转发到后端。

**Tech Stack:** Vue 3, Vite, Express 5, mysql2, Railway (Node.js Service + MySQL Plugin)

---

## 文件改动清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `frontend/src/api/index.js` | 修改 | baseURL 改为 `/api` |
| `frontend/vite.config.js` | 修改 | 添加 server.proxy |
| `backend/src/index.js` | 修改 | 添加静态文件托管 + SPA fallback |
| `backend/tests/static.test.js` | 新建 | 测试静态托管和 SPA fallback |

---

## Task 1: 修改前端 API baseURL

**Files:**
- Modify: `frontend/src/api/index.js:5`

- [ ] **Step 1: 修改 baseURL**

将第 5 行从：
```js
  baseURL: 'http://localhost:3000/api',
```
改为：
```js
  baseURL: '/api',
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/index.js
git commit -m "feat: use relative baseURL for production compatibility"
```

---

## Task 2: 配置 Vite 开发代理

**Files:**
- Modify: `frontend/vite.config.js`

- [ ] **Step 1: 添加 proxy 配置**

将 `frontend/vite.config.js` 改为：
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

- [ ] **Step 2: 本地验证**

```bash
cd frontend && npm run dev
```

在另一个终端启动后端：
```bash
cd backend && node src/index.js
```

访问 `http://localhost:5173`，确认登录/注册功能正常（请求通过 proxy 转发到 3000 端口）。

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.js
git commit -m "feat: add vite proxy for local dev"
```

---

## Task 3: Express 添加静态文件托管和 SPA fallback

**Files:**
- Modify: `backend/src/index.js`
- Create: `backend/tests/static.test.js`

- [ ] **Step 1: 写失败测试**

新建 `backend/tests/static.test.js`：
```js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/index');

const distDir = path.join(__dirname, '../../frontend/dist');
const indexHtml = path.join(distDir, 'index.html');

beforeAll(() => {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(indexHtml, '<html><body>test</body></html>');
});

afterAll(() => {
  fs.rmSync(distDir, { recursive: true, force: true });
});

describe('Static file serving', () => {
  it('serves index.html for unknown routes', async () => {
    const res = await request(app).get('/some-unknown-page');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html>');
  });

  it('does not intercept /api routes', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd backend && npm test -- tests/static.test.js
```

预期：`serves index.html for unknown routes` 失败（404 或其他），`does not intercept /api routes` 通过。

- [ ] **Step 3: 修改 `backend/src/index.js` 添加静态托管**

在文件顶部 `require` 区域添加 `path`，在路由注册前添加静态托管和 SPA fallback。完整文件内容：

```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/todos', require('./routes/todos'));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd backend && npm test -- tests/static.test.js
```

预期：两个测试均 PASS。

- [ ] **Step 5: 运行全部测试确认无回归**

```bash
cd backend && npm test
```

预期：所有测试 PASS（auth、todos、middleware、static）。

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.js backend/tests/static.test.js
git commit -m "feat: serve frontend static files and add SPA fallback"
```

---

## Task 4: Railway 部署（手动操作）

这个 Task 是手动操作步骤，无需写代码。

- [ ] **Step 1: 推送代码到 GitHub**

```bash
git push origin master
```

确认 GitHub 仓库已有最新代码。

- [ ] **Step 2: 创建 Railway Project**

1. 访问 [railway.app](https://railway.app) 并登录（没有账号则注册）
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 授权并选择你的仓库
5. Railway 自动检测 root `package.json`，Build Command 为 `npm run build`，Start Command 为 `npm start`

- [ ] **Step 3: 添加 MySQL Plugin**

在 Railway Project 页面：
1. 点击 **+ New** → **Database** → **Add MySQL**
2. 等待 MySQL Plugin 启动（约 30 秒）

- [ ] **Step 4: 配置 Service 环境变量**

在 Railway Service → **Variables** 标签页，点击 **New Variable** 逐一添加：

| 变量名 | 值 |
|---|---|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `JWT_SECRET` | 任意随机字符串，例如运行 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成 |
| `NODE_ENV` | `production` |

- [ ] **Step 5: 初始化数据库**

在 Railway MySQL Plugin → **Data** 标签页，将以下 SQL 粘贴并执行：

```sql
CREATE DATABASE IF NOT EXISTS todo_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE todo_app;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- [ ] **Step 6: 触发部署并验证**

1. Railway 在添加环境变量后会自动重新部署，等待 Deploy 状态变为 **Success**
2. 在 Service → **Settings** → **Domains** 里点击 **Generate Domain** 获取公网 URL
3. 访问该 URL，验证：
   - 登录页正常显示
   - 注册 / 登录功能正常
   - Todo 增删改查正常
   - 刷新任意页面不出现 404（SPA fallback 生效）
