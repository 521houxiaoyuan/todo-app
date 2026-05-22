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
