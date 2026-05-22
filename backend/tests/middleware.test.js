const request = require('supertest');
const app = require('../src/index');

describe('authMiddleware', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  it('passes through for a valid token', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 42 }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
