# TODO List 应用设计文档

**日期**：2026-05-21  
**技术栈**：Vue 3 + Node.js (Express) + MySQL

---

## 概述

一个支持多用户的 TODO List 应用。用户注册登录后可以管理自己的待办事项，支持添加、删除、编辑、标记完成。前后端完全分离，通过 REST API 通信。

---

## 架构

```
┌─────────────────┐         HTTP/REST          ┌─────────────────────┐
│   Vue 3 前端     │  ◄──────────────────────►  │   Express 后端       │
│   (Vite, :5173) │         JWT Auth            │   (Node.js, :3000)  │
└─────────────────┘                             └──────────┬──────────┘
                                                           │
                                                           │ mysql2
                                                           ▼
                                                ┌─────────────────────┐
                                                │      MySQL DB        │
                                                │  users + todos 表    │
                                                └─────────────────────┘
```

**前端依赖**：Vue 3, Vite, Vue Router, Pinia, Axios  
**后端依赖**：Express, mysql2, bcrypt, jsonwebtoken, cors

**认证流程**：登录成功后后端返回 JWT，前端存入 localStorage，后续请求在 `Authorization: Bearer <token>` 头里携带，后端中间件验证。

**CORS**：后端配置 `cors` 中间件，开发环境允许 `http://localhost:5173`，生产环境按实际域名配置。

---

## 数据模型

### users 表

```sql
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### todos 表

```sql
CREATE TABLE todos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- `todos.user_id` 外键关联 `users.id`
- `ON DELETE CASCADE`：删除用户时自动删除其所有 todo
- 密码只存 bcrypt hash
- `updated_at` 由 MySQL 自动维护

---

## API 设计

### 认证接口（无需 token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册，body: `{ username, password }` |
| POST | /api/auth/login | 登录，返回 `{ data: { token } }` |

### Todo 接口（需要 Bearer token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/todos | 获取当前用户所有 todo |
| POST | /api/todos | 新建 todo，body: `{ title }` |
| PUT | /api/todos/:id | 编辑 todo，body: `{ title?, completed? }` |
| DELETE | /api/todos/:id | 删除 todo |

### 响应格式

```json
// 成功（单对象）
{ "data": { "id": 1, "title": "...", "completed": false } }

// 成功（列表，GET /api/todos）
{ "data": [ { "id": 1, "title": "...", "completed": false } ] }

// 错误
{ "error": "错误描述" }
```

- 所有 todo 接口经过 `authMiddleware`，从 JWT 取 `user_id`，只操作自己的数据
- 编辑和标记完成共用 `PUT`，body 传哪个字段就更新哪个
- 后端每次操作都验证 todo 的 `user_id` 等于当前登录用户，防止越权

---

## 前端结构

### 路由

| 路径 | 页面 | 是否需要登录 |
|------|------|------------|
| /login | 登录页 | 否 |
| /register | 注册页 | 否 |
| / | Todo 主页 | 是 |

### 目录结构

```
src/
├── views/
│   ├── LoginView.vue       登录表单
│   ├── RegisterView.vue    注册表单
│   └── TodoView.vue        主页面
├── components/
│   ├── TodoItem.vue        单条 todo（展示、编辑、删除、勾选）
│   └── TodoForm.vue        新建 todo 的输入框
├── stores/
│   └── todo.js             Pinia store，管理 todo 列表状态
├── api/
│   └── index.js            Axios 实例 + 所有接口封装
└── router/
    └── index.js            路由配置 + 导航守卫
```

- 导航守卫：未登录访问 `/` 跳转 `/login`；已登录访问 `/login` 跳转 `/`
- Pinia store 持有 todo 列表，增删改先调 API，成功后更新本地状态（不做乐观更新）

---

## 错误处理与安全

### 后端

- 所有路由 try/catch 包裹，未捕获错误返回 500
- JWT 过期或无效返回 401
- 操作不属于自己的 todo 返回 403
- 输入校验：title 不能为空，username 3-50 字符，password 6-100 字符

### 前端

- Axios 响应拦截器统一处理 401（清除 token，跳转登录页）
- 操作失败在页面顶部显示错误提示
- 表单提交时禁用按钮防止重复提交

### 安全要点

- 密码用 bcrypt 加密（salt rounds = 10）
- JWT 过期时间 7 天
- 后端每次操作 todo 都验证 `user_id`，不依赖前端传参
