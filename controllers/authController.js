const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const users = require('../models/users');
const codes = require('../models/codes');
const { send } = require('../utils/mail');
const { invalid, forbidden, required } = require('../utils/errors');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const DOMAIN = (process.env.ALLOWED_DOMAIN || 'usc.edu.ph').toLowerCase();
const google = new OAuth2Client(CLIENT_ID);

const startSession = (req, user, remember) => new Promise((resolve, reject) => {
  req.session.regenerate(err => {
    if (err) return reject(err);
    req.session.userId = user.id;
    req.session.cookie.maxAge = remember ? 30 * 864e5 : null;
    req.session.save(e => (e ? reject(e) : resolve()));
  });
});

const config = (req, res) => {
  res.json({ googleClientId: CLIENT_ID || '', domain: DOMAIN, demo: process.env.DEMO_MODE === 'true' });
};

const login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) throw invalid('This is a required field.');

  const user = await users.findByEmail(email);
  const ok = user && user.passwordHash && user.active && await bcrypt.compare(password, user.passwordHash);

  if (!ok) throw invalid('Invalid email or password.');

  await startSession(req, user, req.body.remember);
  res.json({ ok: true });
};

const cleanEmail = req => String(req.body.email || '').trim().toLowerCase();

const checkPassword = password => {
  if (password.length < 8) throw invalid('Password must be at least 8 characters.');
  if (password.length > 72) throw invalid('Password is too long.');
};

const sendCode = async (email, purpose, extra = {}) => {
  const code = String(crypto.randomInt(1e6)).padStart(6, '0');
  await codes.save({ email, purpose, codeHash: await bcrypt.hash(code, 10), ...extra });
  const what = purpose === 'signup' ? 'create your AcadTrack account' : 'reset your AcadTrack password';
  await send(email, `Your AcadTrack code: ${code}`, `Your code is ${code}. Use it to ${what}. It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`);
};

const signup = async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 150);
  const email = cleanEmail(req);
  const password = String(req.body.password || '');

  required(name, email, password);
  if (!email.endsWith('@' + DOMAIN)) throw invalid(`Use your @${DOMAIN} email.`);
  checkPassword(password);

  const user = await users.findByEmail(email);
  if (user && user.passwordHash) throw invalid('An account with this email already exists. Sign in instead.');

  await sendCode(email, 'signup', { name, passwordHash: await bcrypt.hash(password, 10) });
  res.json({ ok: true });
};

const forgot = async (req, res) => {
  const email = cleanEmail(req);

  required(email);

  const user = await users.findByEmail(email);
  if (user && user.active) await sendCode(email, 'reset');

  res.json({ ok: true });
};

const verify = async (req, res) => {
  const email = cleanEmail(req);
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'signup';
  const code = String(req.body.code || '').trim();
  const row = await codes.find(email, purpose);

  required(code);

  if (!row || row.expired || row.attempts >= 5) throw invalid('This code has expired. Send a new one.');
  if (!(await bcrypt.compare(code, row.codeHash))) {
    await codes.miss(email, purpose);
    throw invalid('Wrong code. Check your email and try again.');
  }

  let user = await users.findByEmail(email);
  let passwordHash = row.passwordHash;

  if (user && !user.active) throw forbidden('Your account has been deactivated. Please contact the admin.');

  if (purpose === 'reset') {
    const password = String(req.body.password || '');
    checkPassword(password);
    passwordHash = await bcrypt.hash(password, 10);
  }

  if (!user && purpose === 'signup') {
    user = await users.create({ name: row.name, email, role: 'Student', passwordHash });
  } else if (user) {
    await users.setPassword(user.id, passwordHash);
  } else {
    throw invalid('This code has expired. Send a new one.');
  }

  await codes.remove(email, purpose);
  await startSession(req, user, true);
  res.json({ ok: true });
};

const googleLogin = async (req, res) => {
  if (!CLIENT_ID) throw invalid('Google sign-in is not set up yet.');

  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: String(req.body.credential || ''), audience: CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw invalid('Google sign-in failed. Please try again.');
  }

  const email = String(payload.email || '').toLowerCase();

  if (!payload.email_verified) throw invalid('Your Google email is not verified.');

  let user = await users.findByGoogleId(payload.sub) || await users.findByEmail(email);

  if (!user) {
    if (!email.endsWith('@' + DOMAIN)) {
      throw forbidden(`Please sign in with your @${DOMAIN} account.`);
    }
    user = await users.create({ name: payload.name || email.split('@')[0], email, role: 'Student', googleId: payload.sub });
  } else if (!user.googleId) {
    await users.linkGoogle(user.id, payload.sub, payload.name || '');
  }

  if (!user.active) throw forbidden('Your account has been deactivated. Please contact the admin.');

  await startSession(req, user, true);
  res.json({ ok: true });
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('acadtrack.sid');
    res.json({ ok: true });
  });
};

module.exports = { config, login, signup, forgot, verify, googleLogin, logout };
