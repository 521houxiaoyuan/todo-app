# Railway 部署设计文档

**日期**：2026-05-21  
**目标**：将 TODO List 应用免费部署到 Railway，一个服务托管前后端，一个 MySQL 插件提供数据库。

---

## 架构

生产环境下，Express 同时作为 API 服务器和静态文件服务器：

```
Railway Service (Node.js)
├── GET /api/*     → Express 路由处理
└── GET /*         → 返回 frontend/dist/index.html（Vue SPA）

Railway MySQL Plugin
└── 自动注入 MYSQL_URL 等环境变量
```

前端 `baseURL` 改为相对路径 `/api`，与后端同域，无需 CORS。

---

## 需要修改的文件

### 1. 根目录 `package.json`（新建）

Railway 从根目录读取构建和启动命令：

```json
{
  "name": "todo-app",
  "scripts": {
    "build": "cd frontend && npm install && npm run build",
    "start": "cd backend && node src/index.js"
  }
}
```

### 2. 根目录 `.gitignore`（新建）

```
node_modules/
backend/node_modules/
frontend/node_modules/
frontend/dist/
backend/.env
```

### 3. `backend/src/index.js`

生产环境 serve 静态文件，在 API 路由之后、错误处理之前添加：

```js
const path = require('path');

// 生产环境 serve 前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}
```

同时移除 CORS 限制（同域不需要）：
```js
// 开发环境才需要 CORS
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
}
```

### 4. `frontend/src/api/index.js`

`baseURL` 改为环境变量驱动，生产环境用相对路径：

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});
```

本地开发在 `frontend/.env.local` 中设置：
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### 5. `backend/src/db.js`

Railway MySQL 插件注入 `MYSQL_URL`（连接字符串格式），需要支持解析：

```js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

if (process.env.MYSQL_URL) {
  // Railway 注入的连接字符串
  pool = mysql.createPool(process.env.MYSQL_URL);
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

### 6. `backend/src/migrate.js`（新建）

启动时自动建表（幂等，IF NOT EXISTS）：

```js
const pool = require('./db');

async function migrate() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  console.log('Migration complete');
}

module.exports = migrate;
```

在 `index.js` 启动时调用：
```js
const migrate = require('./migrate');
// 在 app.listen 之前
await migrate();
```

---

## Railway 配置

Railway 项目设置中需要手动添加的环境变量：

| 变量 | 值 |
|------|-----|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 随机长字符串（32位以上） |

MySQL 相关变量由 Railway MySQL 插件自动注入（`MYSQL_URL`）。

---

## 部署步骤（人工操作）

1. 推代码到 GitHub（新建公开仓库）
2. 登录 railway.app，新建项目，连接 GitHub 仓库
3. 添加 MySQL 插件
4. 设置环境变量 `NODE_ENV=production`、`JWT_SECRET=<随机值>`
5. 触发部署，等待构建完成
6. 访问 Railway 生成的域名

---

## 自检

- 无 TBD/TODO 占位符
- 本地开发流程不受影响（`.env.local` 保持 localhost 配置）
- 建表脚本幂等，重复部署不会报错
- 静态文件路由放在 API 路由之后，不会拦截 `/api/*`
