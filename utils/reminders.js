const classes = require('../models/classes');
const assignments = require('../models/assignments');
const notifications = require('../models/notifications');
const { today, addDays, nowMin, weekday, fmtMin } = require('./time');

const dueIn = due => {
  const days = Math.round((new Date(due + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
  if (days === 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
};

const classReminders = async studentId => {
  const mins = nowMin();
  const date = today();
  const soon = (await classes.forStudent(studentId))
    .filter(c => c.days && c.days.includes(weekday()) && mins >= c.start - 15 && mins < c.start);

  for (const c of soon) {
    if (await notifications.exists(studentId, 'CLASS', { classId: c.id, date })) continue;

    await notifications.create({
      userId: studentId,
      classId: c.id,
      date,
      title: `${c.name} starts at ${fmtMin(c.start)}.`,
      message: `${c.room ? 'Room ' + c.room + '. ' : ''}Sign your attendance once class starts.`,
      type: 'CLASS'
    });
  }
};

const deadlineReminders = async (studentId = null) => {
  let sent = 0;
  const rows = await assignments.pendingDueBetween(today(), addDays(2));

  for (const r of rows) {
    if (studentId && r.student_id !== studentId) continue;
    if (await notifications.exists(r.student_id, 'REMINDER', { assignmentId: r.assignment_id })) continue;

    const c = await classes.byId(r.class_id);
    await notifications.create({
      userId: r.student_id,
      assignmentId: r.assignment_id,
      title: `${r.title} is due ${dueIn(r.due_date)}.`,
      message: c ? c.name : '',
      type: 'REMINDER'
    });
    sent++;
  }

  return sent;
};

module.exports = { classReminders, deadlineReminders };
