const crypto = require('crypto');
const classes = require('../models/classes');
const assignments = require('../models/assignments');
const users = require('../models/users');
const notifications = require('../models/notifications');
const attendance = require('../models/attendance');
const materials = require('../models/materials');
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
  const c = await classes.byId(classId);
  const work = await assignments.forClasses([classId]);
  const mats = await materials.forClasses([classId]);

  await classes.enroll(studentId, classId);
  for (const a of work) await assignments.addSubmissions(a.id, [studentId]);

  if (c && c.teacherId) {
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    await notifications.createMany([{
      userId: studentId,
      classId,
      title: `You were added to ${c.name}${c.group ? ` · Group ${c.group}` : ''}.`,
      message: mats.length || work.length ? `${plural(mats.length, 'material')} and ${plural(work.length, 'assignment')} are already posted. Open Classes to see them.` : 'Open Classes to see it.',
      type: 'CLASS'
    }]);
  }
};

const ownClass = async (req, id) => {
  const c = await classes.byId(id);
  if (!c) throw notFound('Class not found.');
  if (c.teacherId !== req.user.id) throw forbidden();
  return c;
};

const classInput = async (req, selfId = 0) => {
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
  const taken = await classes.byCodeGroup(code, groupNo, true);

  if (taken && taken.id !== selfId) throw invalid('That course and group already has a class.');

  return {
    code,
    group: groupNo,
    name: title && String(title).trim() ? `${display} — ${String(title).trim()}` : display,
    days: parsed.days,
    dayText: parsed.dayText,
    start,
    end,
    room: String(room || '').trim().toUpperCase(),
    color: Number.isInteger(+req.body.color) && +req.body.color >= 0 && +req.body.color < 8 ? +req.body.color : null
  };
};

const addStudents = async (c, text) => {
  const emails = [...new Set((String(text || '').match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).map(e => e.toLowerCase()))];
  const result = { added: 0, already: 0, missing: [] };

  for (const email of emails) {
    const u = await users.findByEmail(email);

    if (!u) {
      await classes.invite(c.id, email);
      result.missing.push(email);
    } else if (u.role !== 'Student') {
      result.missing.push(email);
    } else if (await classes.isEnrolled(u.id, c.id)) {
      result.already++;
    } else {
      await enrollStudent(u.id, c.id);
      result.added++;
    }
  }

  return result;
};

const create = async (req, res) => {
  const fields = await classInput(req);
  if (fields.color === null) {
    const used = (await classes.forTeacher(req.user.id)).map(x => x.color);
    fields.color = [0, 1, 2, 3, 4, 5, 6, 7].find(i => !used.includes(i)) ?? used.length % 8;
  }
  const c = await classes.create({ ...fields, teacherId: req.user.id, joinCode: await newJoinCode(), faculty: req.user.name });
  const result = await addStudents(c, req.body.text);

  res.status(201).json({ id: c.id, joinCode: c.joinCode, ...result });
};

const update = async (req, res) => {
  const c = await ownClass(req, req.params.id);
  await classes.edit(c.id, await classInput(req, c.id));
  res.json({ ok: true });
};

const remove = async (req, res) => {
  const c = await ownClass(req, req.params.id);
  await classes.softDelete(c.id);
  res.json({ ok: true });
};

const removeStudent = async (req, res) => {
  const c = await ownClass(req, req.params.id);
  await classes.unenroll(req.params.studentId, c.id);
  res.json({ ok: true });
};

const removeInvite = async (req, res) => {
  const c = await ownClass(req, req.params.id);
  await classes.uninvite(c.id, String(req.body.email || '').toLowerCase());
  res.json({ ok: true });
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
  const result = await addStudents(c, req.body.text);

  if (!result.added && !result.already && !result.missing.length) throw invalid('No emails found. Each student needs an email in the list.');

  res.json(result);
};

const studyLoad = async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 20) : [];

  if (!rows.length) throw invalid('No subjects found. Copy the whole study load table and paste it again.');

  const valid = rows.map(r => ({
    ...r,
    code: String(r.code || '').replace(/\s+/g, '').toUpperCase(),
    name: String(r.code || '').trim().toUpperCase(),
    days: Array.isArray(r.days) ? r.days.map(Number).filter(d => d >= 0 && d <= 6) : [],
    start: Number(r.start),
    end: Number(r.end)
  })).filter(r => r.code && r.days.length && r.start >= 0 && r.end > r.start && r.end < 1440);

  if (!valid.length) throw invalid('No subjects found. Copy the whole study load table and paste it again.');

  await classes.dropSchedule(req.user.id);

  for (const { code, name, days, start, end, ...r } of valid) {
    const group = String(r.group || '').trim();
    let c = await classes.byCodeGroup(code, group, false);

    if (!c) {
      c = await classes.create({
        code, group, name, faculty: String(r.faculty || '').slice(0, 150),
        days, dayText: String(r.dayText || '').slice(0, 30), start, end, room: String(r.room || '').slice(0, 30)
      });
    } else {
      c = await classes.update(c.id, {
        ...c, days, dayText: String(r.dayText || '').slice(0, 30), start, end,
        room: String(r.room || '').slice(0, 30), faculty: String(r.faculty || c.faculty).slice(0, 150)
      });
    }

    await enrollStudent(req.user.id, c.id);
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

const claimInvites = async user => {
  if (user.role !== 'Student') return;
  for (const id of await classes.invitesFor(user.email)) {
    if (!(await classes.isEnrolled(user.id, id))) await enrollStudent(user.id, id);
  }
  await classes.clearInvites(user.email);
};

module.exports = { create, update, remove, removeStudent, removeInvite, join, roster, claimInvites, studyLoad, demoTimes, enrollStudent, ownClass };
