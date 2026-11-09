const { one, many, query } = require('./db');

const COLUMNS = 'MATERIAL_ID, CLASS_ID, CREATED_BY, TITLE, NOTE, LINK, FILE_NAME, FILE_TYPE, POSTED_DATE, (FILE_DATA IS NOT NULL) AS HAS_FILE';

const map = r => r && {
  id: r.material_id,
  classId: r.class_id,
  title: r.title,
  note: r.note,
  link: r.link,
  fileName: r.file_name,
  hasFile: r.has_file,
  posted: r.posted_date
};

const forClasses = async ids => (ids.length
  ? (await many(`SELECT ${COLUMNS} FROM TBL_MATERIAL WHERE CLASS_ID = ANY($1) AND DEL_FLG = 0 ORDER BY INSERT_DATE DESC`, [ids])).map(map)
  : []);

const byId = async id => map(await one(`SELECT ${COLUMNS} FROM TBL_MATERIAL WHERE MATERIAL_ID = $1 AND DEL_FLG = 0`, [id]));

const file = id => one('SELECT CLASS_ID, FILE_NAME, FILE_TYPE, FILE_DATA FROM TBL_MATERIAL WHERE MATERIAL_ID = $1 AND DEL_FLG = 0', [id]);

const create = async m => map(await one(`
  INSERT INTO TBL_MATERIAL (CLASS_ID, CREATED_BY, TITLE, NOTE, LINK, FILE_NAME, FILE_TYPE, FILE_DATA, POSTED_DATE)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${COLUMNS}`,
  [m.classId, m.createdBy, m.title, m.note, m.link, m.fileName, m.fileType, m.data, m.posted]));

const softDelete = id =>
  query('UPDATE TBL_MATERIAL SET DEL_FLG = 1, FILE_DATA = NULL, DELETE_DATE = now() WHERE MATERIAL_ID = $1', [id]);

module.exports = { forClasses, byId, file, create, softDelete };
