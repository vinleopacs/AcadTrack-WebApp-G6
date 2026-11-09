const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const users = require('../models/users');
const { invalid, forbidden } = require('../utils/errors');

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

const adminLogin = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) throw invalid('This is a required field.');

  const user = await users.findByEmail(email);
  const ok = user && user.passwordHash && user.active && await bcrypt.compare(password, user.passwordHash);

  if (!ok) throw invalid('Invalid email or password.');

  await startSession(req, user, req.body.remember);
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

module.exports = { config, adminLogin, googleLogin, logout };
