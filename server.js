require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Manila';

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { pool } = require('./models/db');
const { loadUser } = require('./middleware/auth');
const setup = require('./config/setup');
const api = require('./routes/api');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PROD = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error('Missing DATABASE_URL or SESSION_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  name: 'acadtrack.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 30 * 864e5 }
}));

app.use(loadUser);
app.use('/api', api);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);

  if (status >= 500) {
    console.error(new Date().toISOString(), req.method, req.originalUrl, err);
  }

  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : status === 413 ? 'File is too big.' : err.message
  });
});

setup()
  .then(() => app.listen(PORT, HOST, () => console.log(`AcadTrack is running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error('Could not start AcadTrack:', err.message);
    process.exit(1);
  });
