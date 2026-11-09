const users = require('../models/users');
const classes = require('../models/classes');
const assignments = require('../models/assignments');
const notifications = require('../models/notifications');
const attendance = require('../models/attendance');
const materials = require('../models/materials');
const { classReminders, deadlineReminders } = require('../utils/reminders');
const { enrollStudent } = require('./classController');

const getState = async (req, res) => {
  const me = req.user;
  const db = { users: [], classes: [], enrollments: [], assignments: [], submissions: [], notifications: [], attendance: [], materials: [] };

  if (me.role === 'Admin') {
    db.users = (await users.list()).map(users.publicUser);
  } else {
    if (me.role === 'Student') {
      if (process.env.DEMO_MODE === 'true') {
        const demo = await classes.demo();
        if (demo && !(await classes.isEnrolled(me.id, demo.id))) await enrollStudent(me.id, demo.id);
      }
      await classReminders(me.id);
      await deadlineReminders(me.id);
    }

    const list = me.role === 'Teacher' ? await classes.forTeacher(me.id) : await classes.forStudent(me.id);
    const ids = list.map(c => c.id);

    db.classes = list.map(classes.forClient);
    db.enrollments = me.role === 'Teacher' ? await classes.enrollments(ids) : ids.map(id => [me.id, id]);
    db.assignments = await assignments.forClasses(ids);
    db.submissions = me.role === 'Student' ? await assignments.submissionsForStudent(me.id) : [];
    db.attendance = me.role === 'Student' ? await attendance.forStudent(me.id) : [];
    db.materials = await materials.forClasses(ids);

    const people = new Set([me.id, ...list.map(c => c.teacherId).filter(Boolean), ...db.assignments.map(a => a.teacherId)]);
    if (me.role === 'Teacher') db.enrollments.forEach(e => people.add(e[0]));
    db.users = (await users.findByIds([...people])).map(users.publicUser);
  }

  db.notifications = await notifications.forUser(me.id);

  res.json({ user: users.publicUser(me), db });
};

module.exports = { getState };
