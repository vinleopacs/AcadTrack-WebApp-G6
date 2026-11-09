const bcrypt = require('bcryptjs');
const users = require('../models/users');
const notifications = require('../models/notifications');
const { invalid, forbidden, required } = require('../utils/errors');
const { deadlineReminders } = require('../utils/reminders');

const ROLES = ['Student', 'Teacher', 'Admin'];

const create = async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 150);
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role;
  const password = String(req.body.password || '');

  required(name, email);

  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(email)) throw invalid('Enter a valid email.');
  if (!ROLES.includes(role)) throw invalid('Choose a role.');
  if (role === 'Admin' && password.length < 8) throw invalid('Admin accounts need a password of at least 8 characters.');
  if (await users.findByEmail(email)) throw invalid('That email is already in use.');

  await users.create({ name, email, role, passwordHash: role === 'Admin' ? await bcrypt.hash(password, 10) : null });
  res.status(201).json({ ok: true });
};

const toggle = async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw forbidden('You cannot deactivate your own account.');
  await users.toggle(req.params.id);
  res.json({ ok: true });
};

const readNotification = async (req, res) => {
  await notifications.markRead(req.params.id, req.user.id);
  res.json({ ok: true });
};

const runReminders = async (req, res) => {
  res.json({ sent: await deadlineReminders() });
};

module.exports = { create, toggle, readNotification, runReminders };
