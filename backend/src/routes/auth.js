const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim();
    const { password } = req.body;
    if (!username || username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters' });
    }
    if (!password || password.length < 6 || password.length > 100) {
      return res.status(400).json({ error: 'Password must be 6-100 characters' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hash]
    );
    res.status(201).json({ data: { id: result.insertId, username } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const [rows] = await pool.execute(
      'SELECT id, password FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { token } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
