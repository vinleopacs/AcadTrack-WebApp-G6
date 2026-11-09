const { Pool, types } = require('pg');

types.setTypeParser(1082, v => v);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

const query = (text, params = []) => pool.query(text, params);

const one = async (text, params) => (await query(text, params)).rows[0] || null;

const many = async (text, params) => (await query(text, params)).rows;

const tx = async fn => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, one, many, tx };
