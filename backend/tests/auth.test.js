const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

afterAll(async () => {
  await pool.execute('DELETE FROM users WHERE username LIKE "testuser%"');
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser1', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.username).toBe('testuser1');
  });

  it('returns 400 if username already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser2', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser2', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username already exists');
  });

  it('returns 400 if username too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser3', password: 'password123' });
  });

  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser3', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser3', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 on unknown username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 400 if username or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser3' });
    expect(res.status).toBe(400);
  });
});
