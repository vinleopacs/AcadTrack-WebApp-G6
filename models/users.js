const { one, many, query } = require('./db');

const SELECT = `
  SELECT u.USER_ID, u.NAME, u.EMAIL, u.PASSWORD_HASH, u.GOOGLE_ID, u.IS_ACTIVE, r.ROLE_NAME
  FROM MST_USERS u JOIN MST_ROLES r ON r.ROLE_ID = u.ROLE_ID
  WHERE u.DEL_FLG = 0`;

const map = r => r && {
  id: r.user_id,
  name: r.name,
  email: r.email,
  role: r.role_name,
  active: r.is_active,
  passwordHash: r.password_hash,
  googleId: r.google_id
};

const publicUser = u => u && { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };

const findById = async id => map(await one(`${SELECT} AND u.USER_ID = $1`, [id]));

const findByEmail = async email => map(await one(`${SELECT} AND u.EMAIL = $1`, [email.toLowerCase()]));

const findByGoogleId = async googleId => map(await one(`${SELECT} AND u.GOOGLE_ID = $1`, [googleId]));

const findByIds = async ids => (ids.length ? (await many(`${SELECT} AND u.USER_ID = ANY($1)`, [ids])).map(map) : []);

const list = async () => (await many(`${SELECT} ORDER BY r.ROLE_ID, u.NAME`)).map(map);

const create = async ({ name, email, role, passwordHash = null, googleId = null }) => map(await one(`
  INSERT INTO MST_USERS (ROLE_ID, NAME, EMAIL, PASSWORD_HASH, GOOGLE_ID)
  VALUES ((SELECT ROLE_ID FROM MST_ROLES WHERE ROLE_NAME = $1), $2, $3, $4, $5)
  RETURNING USER_ID, NAME, EMAIL, PASSWORD_HASH, GOOGLE_ID, IS_ACTIVE, $1::text AS ROLE_NAME`,
  [role, name, email.toLowerCase(), passwordHash, googleId]));

const linkGoogle = (id, googleId, name) =>
  query('UPDATE MST_USERS SET GOOGLE_ID = $2, NAME = COALESCE(NULLIF(NAME, \'\'), $3), UPDATE_DATE = now() WHERE USER_ID = $1', [id, googleId, name]);

const toggle = id =>
  query('UPDATE MST_USERS SET IS_ACTIVE = 1 - IS_ACTIVE, UPDATE_DATE = now() WHERE USER_ID = $1', [id]);

const countAdmins = async () => +(await one(`
  SELECT COUNT(*) AS n FROM MST_USERS u JOIN MST_ROLES r ON r.ROLE_ID = u.ROLE_ID
  WHERE u.DEL_FLG = 0 AND r.ROLE_NAME = 'Admin'`)).n;

module.exports = { findById, findByEmail, findByGoogleId, findByIds, list, create, linkGoogle, toggle, countAdmins, publicUser };
