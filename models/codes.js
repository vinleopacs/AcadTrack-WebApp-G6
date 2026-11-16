const { one, query } = require('./db');

const save = ({ email, purpose, codeHash, name = '', passwordHash = null }) => query(`
  INSERT INTO TBL_EMAIL_CODE (EMAIL, PURPOSE, CODE_HASH, NAME, PASSWORD_HASH, EXPIRES_AT)
  VALUES ($1, $2, $3, $4, $5, now() + interval '10 minutes')
  ON CONFLICT (EMAIL, PURPOSE) DO UPDATE SET CODE_HASH = $3, NAME = $4, PASSWORD_HASH = $5, ATTEMPTS = 0, EXPIRES_AT = now() + interval '10 minutes'`,
  [email, purpose, codeHash, name, passwordHash]);

const find = async (email, purpose) => {
  const r = await one(`
    SELECT CODE_HASH, NAME, PASSWORD_HASH, ATTEMPTS, EXPIRES_AT < now() AS EXPIRED
    FROM TBL_EMAIL_CODE WHERE EMAIL = $1 AND PURPOSE = $2`, [email, purpose]);
  return r && { codeHash: r.code_hash, name: r.name, passwordHash: r.password_hash, attempts: r.attempts, expired: r.expired };
};

const miss = (email, purpose) =>
  query('UPDATE TBL_EMAIL_CODE SET ATTEMPTS = ATTEMPTS + 1 WHERE EMAIL = $1 AND PURPOSE = $2', [email, purpose]);

const remove = (email, purpose) =>
  query('DELETE FROM TBL_EMAIL_CODE WHERE EMAIL = $1 AND PURPOSE = $2', [email, purpose]);

module.exports = { save, find, miss, remove };
