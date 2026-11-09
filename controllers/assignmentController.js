const assignments = require('../models/assignments');
const classes = require('../models/classes');
const notifications = require('../models/notifications');
const { tx } = require('../models/db');
const { invalid, forbidden, notFound, required } = require('../utils/errors');
const { today } = require('../utils/time');
const { ownClass } = require('./classController');

const readForm = body => {
  const form = {
    title: String(body.title || '').trim().slice(0, 150),
    description: String(body.description || '').trim().slice(0, 1000),
    due: String(body.due || ''),
    classId: Number(body.classId),
    attachment: String(body.attachment || '').trim().slice(0, 255)
  };

  required(form.title, form.description, form.due, form.classId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.due)) throw invalid('Enter a valid due date.');
  return form;
};

const ownAssignment = async (req, id) => {
  const a = await assignments.byId(id);
  if (!a) throw notFound('Assignment not found.');
  if (a.teacherId !== req.user.id) throw forbidden();
  return a;
};

const create = async (req, res) => {
  const form = readForm(req.body);
  const c = await ownClass(req, form.classId);
  const students = await classes.studentIds(c.id);

  await tx(async client => {
    const a = await assignments.create({ ...form, teacherId: req.user.id, posted: today() }, client);
    await assignments.addSubmissions(a.id, students, client);
    await notifications.createMany(students.map(userId => ({
      userId, assignmentId: a.id, title: `New assignment posted: ${a.title}.`, message: c.name, type: 'NEW'
    })), client);
  });

  res.status(201).json({ ok: true });
};

const update = async (req, res) => {
  const a = await ownAssignment(req, req.params.id);
  const form = readForm(req.body);
  const c = await ownClass(req, form.classId);

  await assignments.update(a.id, form);

  if (form.classId !== a.classId) {
    await assignments.addSubmissions(a.id, await classes.studentIds(c.id));
  }

  const subs = await assignments.submissionsFor(a.id);
  await notifications.createMany(subs.map(s => ({
    userId: s.studentId, assignmentId: a.id, title: `Your teacher updated ${form.title}.`, message: c.name, type: 'UPDATE'
  })));

  res.json({ ok: true });
};

const remove = async (req, res) => {
  const a = await ownAssignment(req, req.params.id);
  await assignments.softDelete(a.id);
  res.json({ ok: true });
};

const complete = async (req, res) => {
  const s = await assignments.submissionById(req.params.id);

  if (!s || s.studentId !== req.user.id) throw notFound('Assignment not found.');
  if (s.status === 'COMPLETED') return res.json({ ok: true });

  const a = await assignments.byId(s.assignmentId);
  await assignments.complete(s.id);
  await notifications.create({ userId: req.user.id, assignmentId: a.id, title: 'Assignment marked as completed.', message: a.title, type: 'DONE' });

  res.json({ ok: true });
};

module.exports = { create, update, remove, complete };
