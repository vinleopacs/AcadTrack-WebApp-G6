const materials = require('../models/materials');
const classes = require('../models/classes');
const notifications = require('../models/notifications');
const { invalid, forbidden, notFound, required } = require('../utils/errors');
const { today } = require('../utils/time');
const { ownClass } = require('./classController');

const MAX_BYTES = 5 * 1024 * 1024;

const create = async (req, res) => {
  const c = await ownClass(req, req.body.classId);
  const title = String(req.body.title || '').trim().slice(0, 150);
  const link = String(req.body.link || '').trim().slice(0, 500);
  const fileName = String(req.body.fileName || '').trim().slice(0, 255);
  const match = String(req.body.data || '').match(/^data:([^;,]*)(;base64)?,(.*)$/);

  required(title);

  if (!match && !link) throw invalid('Add a file or a link.');
  if (link && !/^https?:\/\//i.test(link)) throw invalid('Links must start with http:// or https://');

  const data = match ? Buffer.from(match[3], 'base64') : null;

  if (data && data.length > MAX_BYTES) throw invalid('File is too big. Use a file up to 5 MB or add a link instead.');

  await materials.create({
    classId: c.id,
    createdBy: req.user.id,
    title,
    note: String(req.body.note || '').trim().slice(0, 500),
    link,
    fileName: data ? fileName || 'file' : '',
    fileType: data ? match[1] || 'application/octet-stream' : '',
    data,
    posted: today()
  });

  const students = await classes.studentIds(c.id);
  await notifications.createMany(students.map(userId => ({
    userId, classId: c.id, title: `New material in ${c.name}: ${title}.`, message: 'Open Classes to view it.', type: 'MATERIAL'
  })));

  res.status(201).json({ ok: true });
};

const remove = async (req, res) => {
  const m = await materials.byId(req.params.id);
  if (!m) throw notFound('Material not found.');
  await ownClass(req, m.classId);
  await materials.softDelete(m.id);
  res.json({ ok: true });
};

const download = async (req, res) => {
  const f = await materials.file(req.params.id);

  if (!f || !f.file_data) throw notFound('File not found.');

  const c = await classes.byId(f.class_id);
  const allowed = c && (c.teacherId === req.user.id || await classes.isEnrolled(req.user.id, c.id));

  if (!allowed) throw forbidden();

  res.set({
    'Content-Type': f.file_type || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${f.file_name.replace(/[^\w.\- ]/g, '_')}"`,
    'X-Content-Type-Options': 'nosniff'
  });
  res.send(f.file_data);
};

module.exports = { create, remove, download };
