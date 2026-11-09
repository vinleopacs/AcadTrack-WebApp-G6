const { one, many, query } = require('./db');
const { fmtMin } = require('../utils/time');

const map = r => {
  if (!r) return null;
  const c = {
    id: r.class_id,
    code: r.code,
    group: r.group_no,
    name: r.name,
    teacherId: r.teacher_id || 0,
    faculty: r.faculty,
    joinCode: r.join_code || '',
    hasCode: !!r.attendance_code,
    attendanceCode: r.attendance_code,
    days: r.days ? r.days.split(',').map(Number) : null,
    dayText: r.day_text,
    start: r.start_min,
    end: r.end_min,
    room: r.room,
    isDemo: r.is_demo
  };
  c.schedule = c.days ? `${c.dayText}, ${fmtMin(c.start)} – ${fmtMin(c.end)}${c.room ? ' · ' + c.room : ''}` : '';
  return c;
};

const forClient = c => {
  const { attendanceCode, ...rest } = c;
  return rest;
};

const byId = async id => map(await one('SELECT * FROM MST_CLASS WHERE CLASS_ID = $1 AND DEL_FLG = 0', [id]));

const forTeacher = async id => (await many('SELECT * FROM MST_CLASS WHERE TEACHER_ID = $1 AND DEL_FLG = 0 ORDER BY CODE', [id])).map(map);

const forStudent = async id => (await many(`
  SELECT c.* FROM MST_CLASS c JOIN TBL_ENROLLMENT e ON e.CLASS_ID = c.CLASS_ID
  WHERE e.STUDENT_ID = $1 AND e.DEL_FLG = 0 AND c.DEL_FLG = 0 ORDER BY c.CODE`, [id])).map(map);

const byJoinCode = async code => map(await one('SELECT * FROM MST_CLASS WHERE JOIN_CODE = $1 AND DEL_FLG = 0', [code]));

const byCodeGroup = async (code, group) => map(await one(`
  SELECT * FROM MST_CLASS WHERE CODE = $1 AND DEL_FLG = 0 AND IS_DEMO = 0
  AND (GROUP_NO = '' OR $2 = '' OR GROUP_NO = $2)
  ORDER BY (TEACHER_ID IS NOT NULL) DESC LIMIT 1`, [code, group]));

const demo = async () => map(await one('SELECT * FROM MST_CLASS WHERE IS_DEMO = 1 AND DEL_FLG = 0 LIMIT 1'));

const joinCodeTaken = async code => !!(await one('SELECT 1 FROM MST_CLASS WHERE JOIN_CODE = $1', [code]));

const create = async c => map(await one(`
  INSERT INTO MST_CLASS (CODE, GROUP_NO, NAME, TEACHER_ID, FACULTY, JOIN_CODE, DAYS, DAY_TEXT, START_MIN, END_MIN, ROOM, IS_DEMO)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
  [c.code, c.group || '', c.name, c.teacherId || null, c.faculty || '', c.joinCode || null,
    c.days ? c.days.join(',') : '', c.dayText || '', c.start ?? null, c.end ?? null, c.room || '', c.isDemo || 0]));

const update = async (id, c) => map(await one(`
  UPDATE MST_CLASS SET NAME = $2, TEACHER_ID = $3, JOIN_CODE = $4, DAYS = $5, DAY_TEXT = $6,
  START_MIN = $7, END_MIN = $8, ROOM = $9, FACULTY = $10, UPDATE_DATE = now()
  WHERE CLASS_ID = $1 RETURNING *`,
  [id, c.name, c.teacherId || null, c.joinCode || null, c.days ? c.days.join(',') : '', c.dayText || '',
    c.start ?? null, c.end ?? null, c.room || '', c.faculty || '']));

const setTimes = (id, start, end) =>
  query('UPDATE MST_CLASS SET START_MIN = $2, END_MIN = $3, UPDATE_DATE = now() WHERE CLASS_ID = $1', [id, start, end]);

const enroll = (studentId, classId) => query(`
  INSERT INTO TBL_ENROLLMENT (STUDENT_ID, CLASS_ID) VALUES ($1, $2)
  ON CONFLICT (STUDENT_ID, CLASS_ID) DO UPDATE SET DEL_FLG = 0`, [studentId, classId]);

const isEnrolled = async (studentId, classId) =>
  !!(await one('SELECT 1 FROM TBL_ENROLLMENT WHERE STUDENT_ID = $1 AND CLASS_ID = $2 AND DEL_FLG = 0', [studentId, classId]));

const studentIds = async classId =>
  (await many('SELECT STUDENT_ID FROM TBL_ENROLLMENT WHERE CLASS_ID = $1 AND DEL_FLG = 0', [classId])).map(r => r.student_id);

const enrollments = async classIds => (classIds.length
  ? (await many('SELECT STUDENT_ID, CLASS_ID FROM TBL_ENROLLMENT WHERE CLASS_ID = ANY($1) AND DEL_FLG = 0', [classIds])).map(r => [r.student_id, r.class_id])
  : []);

module.exports = {
  byId, forTeacher, forStudent, byJoinCode, byCodeGroup, demo, joinCodeTaken,
  create, update, setTimes, enroll, isEnrolled, studentIds, enrollments, forClient
};
