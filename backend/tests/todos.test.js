const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

let token;
let userId;

beforeAll(async () => {
  await pool.execute('DELETE FROM users WHERE username = "todotest"');
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'todotest', password: 'password123' });
  userId = reg.body.data.id;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'todotest', password: 'password123' });
  token = login.body.data.token;
});

afterAll(async () => {
  await pool.execute('DELETE FROM users WHERE username = "todotest"');
  await pool.end();
});

describe('GET /api/todos', () => {
  it('returns empty list initially', async () => {
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /api/todos', () => {
  it('creates a todo', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Buy milk');
    expect(res.body.data.completed).toBe(false);
    expect(res.body.data).toHaveProperty('id');
  });

  it('returns 400 if title is empty', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/todos/:id', () => {
  let todoId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edit me' });
    todoId = res.body.data.id;
  });

  it('updates title', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edited title' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Edited title');
  });

  it('marks as completed', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(true);
  });

  it("returns 403 for another user's todo", async () => {
    await pool.execute('DELETE FROM users WHERE username = "otheruser"');
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'otheruser', password: 'password123' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'otheruser', password: 'password123' });
    const otherToken = loginRes.body.data.token;
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
    await pool.execute('DELETE FROM users WHERE username = "otheruser"');
  });

  it('returns 404 for non-existent todo', async () => {
    const res = await request(app)
      .put('/api/todos/99999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  let todoId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete me' });
    todoId = res.body.data.id;
  });

  it('deletes a todo', async () => {
    const res = await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(todoId);
  });

  it('returns 404 for already deleted todo', async () => {
    const res = await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/todos/:id - ownership', () => {
  let todoId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Protected todo' });
    todoId = res.body.data.id;
  });

  it('returns 403 when deleting another user\'s todo', async () => {
    await pool.execute('DELETE FROM users WHERE username = "deleteother"');
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'deleteother', password: 'password123' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'deleteother', password: 'password123' });
    const otherToken = loginRes.body.data.token;
    const res = await request(app)
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
    await pool.execute('DELETE FROM users WHERE username = "deleteother"');
  });
});
