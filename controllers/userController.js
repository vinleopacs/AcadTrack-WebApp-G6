const bcrypt = require('bcryptjs');
const users = require('../models/users');
const notifications = require('../models/notifications');
const { invalid, forbidden, notFound, required } = require('../utils/errors');
const { deadlineReminders } = require('../utils/reminders');

const ROLES = ['Student', 'Teacher', 'Admin'];
const THEMES = ['system', 'light', 'dark'];
const PHOTO = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const create = async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 150);
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role;
  const password = String(req.body.password || '');

  required(name, email);

  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(email)) throw invalid('Enter a valid email.');
  if (!ROLES.includes(role)) throw invalid('Choose a role.');
  if (password.length < 8) throw invalid('Password must be at least 8 characters.');
  if (await users.findByEmail(email)) throw invalid('That email is already in use.');

  await users.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ ok: true });
};

const setPassword = async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) throw invalid('Password must be at least 8 characters.');
  await users.setPassword(req.params.id, await bcrypt.hash(password, 10));
  res.json({ ok: true });
};

const toggle = async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw forbidden('You cannot deactivate your own account.');
  await users.toggle(req.params.id);
  res.json({ ok: true });
};

const updateLook = async (req, res) => {
  const { theme, accent } = req.body;
  if (!THEMES.includes(theme)) throw invalid('Choose a theme.');
  if (!Number.isInteger(accent) || accent < 0 || accent > 5) throw invalid('Choose a color.');
  await users.setLook(req.user.id, theme, accent);
  res.json({ ok: true });
};

const setPhoto = async (req, res) => {
  const photo = req.body.photo ?? null;
  if (photo !== null && (typeof photo !== 'string' || photo.length > 400000 || !PHOTO.test(photo))) throw invalid('Use a JPG, PNG or WebP photo.');
  await users.setAvatar(req.user.id, photo);
  res.json({ ok: true });
};

const photo = async (req, res) => {
  const m = String(await users.avatar(req.params.id) || '').match(PHOTO);
  if (!m) throw notFound('No photo.');
  res.set('Cache-Control', 'private, max-age=31536000').type(m[1]).send(Buffer.from(m[2], 'base64'));
};

const readNotification = async (req, res) => {
  await notifications.markRead(req.params.id, req.user.id);
  res.json({ ok: true });
};

const runReminders = async (req, res) => {
  res.json({ sent: await deadlineReminders() });
};

module.exports = { create, setPassword, toggle, updateLook, setPhoto, photo, readNotification, runReminders };
