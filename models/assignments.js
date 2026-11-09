const { one, many, query } = require('./db');

const map = r => r && {
  id: r.assignment_id,
  classId: r.class_id,
  teacherId: r.created_by,
  title: r.title,
  description: r.instructions,
  attachment: r.attachment,
  due: r.due_date,
  posted: r.posted_date,
  deleted: r.del_flg
};

const mapSub = r => ({ id: r.student_assignment_id, assignmentId: r.assignment_id, studentId: r.student_id, status: r.status });

const byId = async id => map(await one('SELECT * FROM TBL_ASSIGNMENT WHERE ASSIGNMENT_ID = $1 AND DEL_FLG = 0', [id]));

const forClasses = async ids => (ids.length
  ? (await many('SELECT * FROM TBL_ASSIGNMENT WHERE CLASS_ID = ANY($1) AND DEL_FLG = 0', [ids])).map(map)
  : []);

const create = async (a, client) => map((await (client || { query }).query(`
  INSERT INTO TBL_ASSIGNMENT (CLASS_ID, CREATED_BY, TITLE, INSTRUCTIONS, ATTACHMENT, DUE_DATE, POSTED_DATE)
  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  [a.classId, a.teacherId, a.title, a.description, a.attachment, a.due, a.posted])).rows[0]);

const update = async (id, a) => map(await one(`
  UPDATE TBL_ASSIGNMENT SET CLASS_ID = $2, TITLE = $3, INSTRUCTIONS = $4, ATTACHMENT = $5, DUE_DATE = $6, UPDATE_DATE = now()
  WHERE ASSIGNMENT_ID = $1 RETURNING *`, [id, a.classId, a.title, a.description, a.attachment, a.due]));

const softDelete = id =>
  query('UPDATE TBL_ASSIGNMENT SET DEL_FLG = 1, DELETE_DATE = now() WHERE ASSIGNMENT_ID = $1', [id]);

const addSubmissions = (assignmentId, studentIds, client) => (studentIds.length
  ? (client || { query }).query(`
    INSERT INTO TBL_STUDENT_ASSIGNMENT (STUDENT_ID, ASSIGNMENT_ID)
    SELECT unnest($1::int[]), $2 ON CONFLICT DO NOTHING`, [studentIds, assignmentId])
  : null);

const submissionsForStudent = async id => (await many(`
  SELECT s.* FROM TBL_STUDENT_ASSIGNMENT s JOIN TBL_ASSIGNMENT a ON a.ASSIGNMENT_ID = s.ASSIGNMENT_ID
  WHERE s.STUDENT_ID = $1 AND s.DEL_FLG = 0 AND a.DEL_FLG = 0`, [id])).map(mapSub);

const submissionsFor = async assignmentId =>
  (await many('SELECT * FROM TBL_STUDENT_ASSIGNMENT WHERE ASSIGNMENT_ID = $1 AND DEL_FLG = 0', [assignmentId])).map(mapSub);

const submissionById = async id => {
  const r = await one('SELECT * FROM TBL_STUDENT_ASSIGNMENT WHERE STUDENT_ASSIGNMENT_ID = $1', [id]);
  return r && mapSub(r);
};

const complete = id => query(`
  UPDATE TBL_STUDENT_ASSIGNMENT SET STATUS = 'COMPLETED', COMPLETED_AT = now(), UPDATE_DATE = now()
  WHERE STUDENT_ASSIGNMENT_ID = $1`, [id]);

const pendingDueBetween = async (from, to) => many(`
  SELECT s.STUDENT_ID, a.ASSIGNMENT_ID, a.TITLE, a.DUE_DATE, a.CLASS_ID
  FROM TBL_STUDENT_ASSIGNMENT s JOIN TBL_ASSIGNMENT a ON a.ASSIGNMENT_ID = s.ASSIGNMENT_ID
  WHERE s.STATUS = 'PENDING' AND s.DEL_FLG = 0 AND a.DEL_FLG = 0 AND a.DUE_DATE BETWEEN $1 AND $2`, [from, to]);

module.exports = {
  byId, forClasses, create, update, softDelete, addSubmissions,
  submissionsForStudent, submissionsFor, submissionById, complete, pendingDueBetween
};
