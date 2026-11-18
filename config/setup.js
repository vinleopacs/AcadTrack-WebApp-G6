const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const users = require('../models/users');
const classes = require('../models/classes');

const setup = async () => {
  await query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const admin = email && await users.findByEmail(email);

  if (admin && admin.role === 'Admin' && password && !admin.passwordHash) {
    await users.setPassword(admin.id, await bcrypt.hash(password, 10));
  } else if (!(await users.countAdmins())) {
    if (!email || !password) {
      console.warn('No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one.');
    } else {
      await users.create({ name: 'Administrator', email, role: 'Admin', passwordHash: await bcrypt.hash(password, 10) });
      console.log(`Admin account created for ${email}`);
    }
  }

  if (process.env.DEMO_MODE === 'true' && !(await classes.demo())) {
    await classes.create({
      code: 'DEMO101',
      name: 'DEMO 101 — Attendance Demo',
      faculty: 'AcadTrack Demo',
      joinCode: 'DEMO101',
      days: [0, 1, 2, 3, 4, 5, 6],
      dayText: 'Every day',
      start: 0,
      end: 1439,
      room: 'DEMO',
      isDemo: 1
    });
  }
};

module.exports = setup;
