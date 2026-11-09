const { one, many, query } = require('./db');

const map = r => ({ id: r.attendance_id, studentId: r.student_id, classId: r.class_id, date: r.att_date, status: r.status });

const forStudent = async id =>
  (await many('SELECT * FROM TBL_ATTENDANCE WHERE STUDENT_ID = $1 AND DEL_FLG = 0 ORDER BY ATT_DATE DESC', [id])).map(map);

const find = async (studentId, classId, date) => {
  const r = await one('SELECT * FROM TBL_ATTENDANCE WHERE STUDENT_ID = $1 AND CLASS_ID = $2 AND ATT_DATE = $3 AND DEL_FLG = 0', [studentId, classId, date]);
  return r && map(r);
};

const create = (studentId, classId, date, status) => query(`
  INSERT INTO TBL_ATTENDANCE (STUDENT_ID, CLASS_ID, ATT_DATE, STATUS) VALUES ($1, $2, $3, $4)
  ON CONFLICT (STUDENT_ID, CLASS_ID, ATT_DATE) DO UPDATE SET STATUS = $4, DEL_FLG = 0, INSERT_DATE = now()`,
  [studentId, classId, date, status]);

const clearClassDay = (classId, date, studentId) =>
  query('UPDATE TBL_ATTENDANCE SET DEL_FLG = 1 WHERE CLASS_ID = $1 AND ATT_DATE = $2 AND STUDENT_ID = $3', [classId, date, studentId]);

module.exports = { forStudent, find, create, clearClassDay };
