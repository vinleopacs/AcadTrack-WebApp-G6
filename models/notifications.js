const { one, many, query } = require('./db');

const map = r => ({
  id: r.notification_id,
  userId: r.user_id,
  assignmentId: r.assignment_id,
  classId: r.class_id,
  date: r.notif_date,
  title: r.title,
  message: r.message,
  type: r.notif_type,
  read: r.is_read,
  at: new Date(r.insert_date).toISOString()
});

const forUser = async id =>
  (await many('SELECT * FROM TBL_NOTIFICATION WHERE USER_ID = $1 AND DEL_FLG = 0 ORDER BY INSERT_DATE DESC LIMIT 200', [id])).map(map);

const create = (n, client) => (client || { query }).query(`
  INSERT INTO TBL_NOTIFICATION (USER_ID, ASSIGNMENT_ID, CLASS_ID, NOTIF_DATE, TITLE, MESSAGE, NOTIF_TYPE)
  VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [n.userId, n.assignmentId || null, n.classId || null, n.date || null, n.title, n.message || '', n.type]);

const createMany = async (list, client) => {
  for (const n of list) await create(n, client);
};

const exists = async (userId, type, { assignmentId = null, classId = null, date = null }) => !!(await one(`
  SELECT 1 FROM TBL_NOTIFICATION WHERE USER_ID = $1 AND NOTIF_TYPE = $2 AND DEL_FLG = 0
  AND ($3::int IS NULL OR ASSIGNMENT_ID = $3) AND ($4::int IS NULL OR CLASS_ID = $4) AND ($5::date IS NULL OR NOTIF_DATE = $5)`,
  [userId, type, assignmentId, classId, date]));

const markRead = (id, userId) =>
  query('UPDATE TBL_NOTIFICATION SET IS_READ = 1 WHERE NOTIFICATION_ID = $1 AND USER_ID = $2', [id, userId]);

const clearClassDay = (classId, date, userId) =>
  query('UPDATE TBL_NOTIFICATION SET DEL_FLG = 1 WHERE CLASS_ID = $1 AND NOTIF_DATE = $2 AND USER_ID = $3', [classId, date, userId]);

module.exports = { forUser, create, createMany, exists, markRead, clearClassDay };
