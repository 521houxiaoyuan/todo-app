# Railway 部署实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改代码配置，使 TODO List 应用可以一键部署到 Railway（Express 托管前端静态文件 + MySQL 插件）。

**Architecture:** 生产环境下 Express 同时作为 API 服务器和静态文件服务器，前端 baseURL 改为相对路径 `/api`，db.js 支持 Railway 注入的 `MYSQL_URL` 连接字符串，启动时自动执行数据库迁移。

**Tech Stack:** Node.js/Express, Vue 3/Vite, MySQL2, Railway

---

## 文件结构

```
claude-demo/                        ← 根目录
├── package.json                    ← 新建：Railway 构建/启动入口
├── .gitignore                      ← 新建：排除 node_modules、dist、.env
├── backend/
│   └── src/
│       ├── index.js                ← 修改：生产环境 serve 静态文件，条件 CORS
│       ├── db.js                   ← 修改：支持 MYSQL_URL 连接字符串
│       └── migrate.js              ← 新建：启动时自动建表
└── frontend/
    ├── .env.local                  ← 新建：本地开发 API baseURL
    └── src/
        └── api/
            └── index.js            ← 修改：baseURL 改为环境变量驱动
```

---

## Task 1: 根目录配置文件

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建根目录 `package.json`**

```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "scripts": {
    "build": "cd frontend && npm install && npm run build",
    "start": "cd backend && node src/index.js"
  }
}
```

- [ ] **Step 2: 创建根目录 `.gitignore`**

```
node_modules/
backend/node_modules/
frontend/node_modules/
frontend/dist/
backend/.env
frontend/.env.local
```

- [ ] **Step 3: 验证根目录结构**

```bash
ls D:/1-vpn/2-otherfile/claude-demo/
```

预期：看到 `package.json`、`.gitignore`、`backend/`、`frontend/`、`docs/`。

- [ ] **Step 4: Commit**

```bash
cd D:/1-vpn/2-otherfile/claude-demo
git init
git add package.json .gitignore
git commit -m "feat: add root package.json and .gitignore for Railway deployment"
```

---

## Task 2: 数据库连接支持 MYSQL_URL

**Files:**
- Modify: `backend/src/db.js`

- [ ] **Step 1: 读取当前 `backend/src/db.js`**

当前内容：
```js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
```

- [ ] **Step 2: 替换为支持 MYSQL_URL 的版本**

```js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

if (process.env.MYSQL_URL) {
  pool = mysql.createPool(process.env.MYSQL_URL + '?waitForConnections=true&connectionLimit=10');
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

module.exports = pool;
```

- [ ] **Step 3: 验证本地测试仍然通过**

```bash
cd D:/1-vpn/2-otherfile/claude-demo/backend
NODE_ENV=test npx jest --no-coverage 2>&1
```

预期：所有测试通过（21 个）。

- [ ] **Step 4: Commit**

```bash
git add src/db.js
git commit -m "feat: support MYSQL_URL connection string for Railway"
```

---

## Task 3: 启动时自动建表（migrate.js）

**Files:**
- Create: `backend/src/migrate.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: 创建 `backend/src/migrate.js`**

```js
const pool = require('./db');

async function migrate() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      username   VARCHAR(50) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      title       VARCHAR(255) NOT NULL,
      completed   BOOLEAN DEFAULT FALSE,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Migration complete');
}

module.exports = migrate;
```

- [ ] **Step 2: 修改 `backend/src/index.js` 在启动时调用 migrate**

读取当前 index.js，找到 `if (process.env.NODE_ENV !== 'test')` 块，将其改为：

```js
if (process.env.NODE_ENV !== 'test') {
  const migrate = require('./migrate');
  const PORT = process.env.PORT || 3000;
  migrate()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
```

- [ ] **Step 3: 验证本地测试仍然通过**

```bash
cd D:/1-vpn/2-otherfile/claude-demo/backend
NODE_ENV=test npx jest --no-coverage 2>&1
```

预期：所有测试通过（21 个），migrate 不在 test 环境执行。

- [ ] **Step 4: Commit**

```bash
git add src/migrate.js src/index.js
git commit -m "feat: add auto-migration on startup"
```

---

## Task 4: Express 生产环境 serve 静态文件

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: 修改 `backend/src/index.js`**

读取当前文件，做两处修改：

**修改 1**：将无条件的 CORS 改为仅开发环境：

将：
```js
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
```

改为：
```js
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
}
```

**修改 2**：在 API 路由之后、错误处理中间件之前，添加静态文件 serve：

在 `app.use('/api/todos', ...)` 之后，`app.use((err, req, res, next) => ...)` 之前，插入：

```js
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}
```

- [ ] **Step 2: 验证本地测试仍然通过**

```bash
cd D:/1-vpn/2-otherfile/claude-demo/backend
NODE_ENV=test npx jest --no-coverage 2>&1
```

预期：所有测试通过。

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat: serve frontend static files in production"
```

---

## Task 5: 前端 API baseURL 环境变量化

**Files:**
- Modify: `frontend/src/api/index.js`
- Create: `frontend/.env.local`

- [ ] **Step 1: 修改 `frontend/src/api/index.js`**

将：
```js
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});
```

改为：
```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});
```

- [ ] **Step 2: 创建 `frontend/.env.local`（本地开发用）**

```
VITE_API_BASE_URL=http://localhost:3000/api
```

- [ ] **Step 3: 验证前端构建成功**

```bash
cd D:/1-vpn/2-otherfile/claude-demo/frontend
npm run build 2>&1
```

预期：构建成功，无错误。

- [ ] **Step 4: Commit**

```bash
cd D:/1-vpn/2-otherfile/claude-demo/frontend
git add src/api/index.js
git commit -m "feat: use VITE_API_BASE_URL env var for API baseURL"
```

注意：`.env.local` 已在 `.gitignore` 中，不提交。

---

## Task 6: 推送到 GitHub

**这一步需要人工操作，无法自动化。**

- [ ] **Step 1: 在 GitHub 新建仓库**

访问 https://github.com/new，创建一个新的公开仓库，名称如 `todo-app`，不要初始化 README。

- [ ] **Step 2: 在根目录初始化 git 并推送**

```bash
cd D:/1-vpn/2-otherfile/claude-demo

# 如果根目录还没有 git 仓库
git init
git add .
git commit -m "chore: initial commit for Railway deployment"

# 添加远程并推送（替换 YOUR_USERNAME 和 YOUR_REPO）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

预期：代码成功推送到 GitHub，仓库中可以看到 `backend/`、`frontend/`、`package.json`、`.gitignore`。

---

## Task 7: Railway 部署（人工操作）

**这一步需要人工在浏览器中操作。**

- [ ] **Step 1: 登录 Railway**

访问 https://railway.app，用 GitHub 账号登录。

- [ ] **Step 2: 新建项目，连接 GitHub 仓库**

点击 "New Project" → "Deploy from GitHub repo" → 选择刚推送的仓库。

Railway 会自动检测根目录的 `package.json` 并使用 `build` 和 `start` 脚本。

- [ ] **Step 3: 添加 MySQL 插件**

在项目页面点击 "+ New" → "Database" → "Add MySQL"。

Railway 会自动创建 MySQL 实例并注入 `MYSQL_URL` 等环境变量到服务中。

- [ ] **Step 4: 设置环境变量**

在服务的 "Variables" 标签页，添加：

| 变量名 | 值 |
|--------|-----|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 生成一个随机字符串，例如运行 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 获取 |

- [ ] **Step 5: 触发部署**

Railway 在添加环境变量后会自动重新部署。等待构建完成（约 2-3 分钟）。

- [ ] **Step 6: 访问应用**

在服务的 "Settings" → "Domains" 中，点击 "Generate Domain" 获取公开 URL。

访问该 URL，验证：
1. 页面正常加载（显示登录页）
2. 注册新用户成功
3. 登录后可以添加、编辑、删除、标记完成 todo
4. 刷新页面后数据仍然存在
