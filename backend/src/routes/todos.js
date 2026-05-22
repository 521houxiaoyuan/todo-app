const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, completed FROM todos WHERE user_id = ? ORDER BY created_at ASC',
      [req.userId]
    );
    res.json({ data: rows.map(r => ({ id: r.id, title: r.title, completed: !!r.completed })) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO todos (user_id, title) VALUES (?, ?)',
      [req.userId, title.trim()]
    );
    res.status(201).json({ data: { id: result.insertId, title: title.trim(), completed: false } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [rows] = await pool.execute('SELECT user_id FROM todos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    if (rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const { title, completed } = req.body;
    const fields = [];
    const values = [];
    if (title !== undefined) {
      if (title.trim() === '') return res.status(400).json({ error: 'Title cannot be empty' });
      fields.push('title = ?');
      values.push(title.trim());
    }
    if (completed !== undefined) {
      fields.push('completed = ?');
      values.push(completed ? 1 : 0);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    await pool.execute(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.execute('SELECT id, title, completed FROM todos WHERE id = ?', [id]);
    res.json({ data: { ...updated[0], completed: !!updated[0].completed } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [rows] = await pool.execute('SELECT user_id FROM todos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    if (rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    await pool.execute('DELETE FROM todos WHERE id = ?', [id]);
    res.json({ data: { id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
