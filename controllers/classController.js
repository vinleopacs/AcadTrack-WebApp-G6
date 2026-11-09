const crypto = require('crypto');
const classes = require('../models/classes');
const assignments = require('../models/assignments');
const users = require('../models/users');
const notifications = require('../models/notifications');
const attendance = require('../models/attendance');
const { invalid, forbidden, notFound, required } = require('../utils/errors');
const { parseDays, today, nowMin } = require('../utils/time');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const newJoinCode = async () => {
  let code;
  do {
    code = Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % 32]).join('');
  } while (await classes.joinCodeTaken(code));
  return code;
};

const toMinutes = t => {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
};

const enrollStudent = async (studentId, classId) => {
  await classes.enroll(studentId, classId);
  for (const a of await assignments.forClasses([classId])) {
    await assignments.addSubmissions(a.id, [studentId]);
  }
};

const ownClass = async (req, id) => {
  const c = await classes.byId(id);
  if (!c) throw notFound('Class not found.');
  if (c.teacherId !== req.user.id) throw forbidden();
  return c;
};

const create = async (req, res) => {
  const { code: raw, group, title, days: dayInput, start: startInput, end: endInput, room } = req.body;

  required(raw, group, dayInput, startInput, endInput);

  const parsed = parseDays(dayInput);
  const start = toMinutes(startInput);
  const end = toMinutes(endInput);

  if (!parsed) throw invalid('Days must be like M W, T Th, F or Sat.');
  if (start === null || end === null) throw invalid('Enter a valid start and end time.');
  if (end <= start) throw invalid('End time must be after start time.');

  const display = String(raw).trim().toUpperCase();
  const code = display.replace(/\s+/g, '');
  const groupNo = String(group).trim();
  const existing = await classes.byCodeGroup(code, groupNo);

  if (existing && existing.teacherId && existing.group === groupNo) {
    throw invalid('That course and group already has a class.');
  }

  const fields = {
    name: title && String(title).trim() ? `${display} — ${String(title).trim()}` : display,
    teacherId: req.user.id,
    joinCode: await newJoinCode(),
    days: parsed.days,
    dayText: parsed.dayText,
    start,
    end,
    room: String(room || '').trim().toUpperCase(),
    faculty: req.user.name
  };

  const c = existing && existing.group === groupNo
    ? await classes.update(existing.id, fields)
    : await classes.create({ ...fields, code, group: groupNo });

  res.status(201).json({ joinCode: c.joinCode });
};

const join = async (req, res) => {
  const code = String(req.body.code || '').replace(/\s+/g, '').toUpperCase();

  required(code);

  const c = await classes.byJoinCode(code);

  if (!c) throw invalid('Class code not found. Ask your professor for the join code.');
  if (await classes.isEnrolled(req.user.id, c.id)) throw invalid('You are already enrolled in this class.');

  await enrollStudent(req.user.id, c.id);
  res.json({ ok: true });
};

const roster = async (req, res) => {
  const c = await ownClass(req, req.params.id);
  const emails = [...new Set((String(req.body.text || '').match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).map(e => e.toLowerCase()))];

  if (!emails.length) throw invalid('No emails found. Each student needs an email in the list.');

  const result = { added: 0, already: 0, missing: [] };

  for (const email of emails) {
    const u = await users.findByEmail(email);

    if (!u || u.role !== 'Student') {
      result.missing.push(email);
    } else if (await classes.isEnrolled(u.id, c.id)) {
      result.already++;
    } else {
      await enrollStudent(u.id, c.id);
      result.added++;
    }
  }

  res.json(result);
};

const studyLoad = async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 20) : [];

  if (!rows.length) throw invalid('No subjects found. Copy the whole study load table and paste it again.');

  for (const r of rows) {
    const code = String(r.code || '').replace(/\s+/g, '').toUpperCase();
    const days = Array.isArray(r.days) ? r.days.map(Number).filter(d => d >= 0 && d <= 6) : [];
    const start = Number(r.start);
    const end = Number(r.end);

    if (!code || !days.length || !(start >= 0 && end > start && end < 1440)) continue;

    const group = String(r.group || '').trim();
    let c = await classes.byCodeGroup(code, group);

    if (!c) {
      c = await classes.create({
        code, group, name: String(r.code).trim().toUpperCase(), faculty: String(r.faculty || '').slice(0, 150),
        days, dayText: String(r.dayText || '').slice(0, 30), start, end, room: String(r.room || '').slice(0, 30)
      });
    } else if (!c.teacherId) {
      c = await classes.update(c.id, {
        ...c, days, dayText: String(r.dayText || '').slice(0, 30), start, end,
        room: String(r.room || '').slice(0, 30), faculty: String(r.faculty || c.faculty).slice(0, 150)
      });
    }

    if (!(await classes.isEnrolled(req.user.id, c.id))) await enrollStudent(req.user.id, c.id);
  }

  res.json({ ok: true });
};

const demoTimes = async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') throw forbidden();

  const c = await classes.demo();
  const m = nowMin();
  const times = { now: [m, m + 60], soon: [m + 2, m + 62], day: [0, 1439] }[req.body.mode];

  if (!c || !times) throw invalid('Unknown demo mode.');

  const [start, end] = times.map(t => Math.max(0, Math.min(1439, t)));
  await classes.setTimes(c.id, start, end);
  await attendance.clearClassDay(c.id, today(), req.user.id);
  await notifications.clearClassDay(c.id, today(), req.user.id);

  res.json({ start, end });
};

module.exports = { create, join, roster, studyLoad, demoTimes, enrollStudent, ownClass };
