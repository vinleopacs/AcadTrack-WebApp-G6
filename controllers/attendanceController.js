const classes = require('../models/classes');
const attendance = require('../models/attendance');
const { invalid, forbidden, notFound, required } = require('../utils/errors');
const { today, nowMin, weekday, fmtMin } = require('../utils/time');

const STATUSES = ['Present', 'Absent', 'Excused', 'No Class'];

const sign = async (req, res) => {
  const { classId, status, code } = req.body;
  const c = await classes.byId(classId);

  if (!c) throw notFound('Class not found.');
  if (!(await classes.isEnrolled(req.user.id, c.id))) throw forbidden('You are not enrolled in this class.');
  if (!STATUSES.includes(status)) throw invalid('Choose Present, Absent, Excused or No Class.');

  if (c.days) {
    if (!c.days.includes(weekday())) {
      throw invalid(`${c.name} has no class today. Schedule: ${c.dayText}, ${fmtMin(c.start)} – ${fmtMin(c.end)}.`);
    }
    if (nowMin() < c.start) {
      throw invalid(`${c.name} hasn't started yet. It starts at ${fmtMin(c.start)}.`);
    }
  }

  if (c.attendanceCode) {
    required(code);
    if (String(code).trim().toUpperCase() !== c.attendanceCode.toUpperCase()) throw invalid('Invalid attendance code.');
  }

  if (await attendance.find(req.user.id, c.id, today())) throw invalid('You already signed attendance for this class today.');

  await attendance.create(req.user.id, c.id, today(), status);
  res.status(201).json({ ok: true });
};

module.exports = { sign };
