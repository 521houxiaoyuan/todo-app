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
