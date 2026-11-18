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
  const db = { users: [], classes: [], enrollments: [], invites: [], requests: [], requested: [], assignments: [], submissions: [], notifications: [], attendance: [], materials: [] };

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
    const profIds = list.filter(c => c.teacherId).map(c => c.id);
    db.enrollments = me.role === 'Teacher'
      ? await classes.enrollments(ids)
      : [...ids.filter(id => !profIds.includes(id)).map(id => [me.id, id]), ...await classes.enrollments(profIds)];
    db.invites = me.role === 'Teacher' ? await classes.pending(ids) : [];
    db.requests = me.role === 'Teacher' ? await classes.requests(ids) : [];
    db.requested = me.role === 'Student' ? (await classes.requestedBy(me.id)).map(classes.forClient) : [];
    db.assignments = await assignments.forClasses(ids);
    db.submissions = me.role === 'Student' ? await assignments.submissionsForStudent(me.id) : [];
    db.attendance = me.role === 'Student' ? await attendance.forStudent(me.id) : [];
    db.materials = await materials.forClasses(ids);

    const people = new Set([me.id, ...list.map(c => c.teacherId).filter(Boolean), ...db.assignments.map(a => a.teacherId)]);
    if (me.role === 'Teacher') db.enrollments.concat(db.requests.map(r => [r[1]])).forEach(e => people.add(e[0]));
    db.requested.forEach(c => c.teacherId && people.add(c.teacherId));
    const classmates = me.role === 'Student' ? db.enrollments.map(e => e[0]).filter(id => !people.has(id)) : [];
    db.users = [
      ...(await users.findByIds([...people])).map(users.publicUser),
      ...(await users.findByIds([...new Set(classmates)])).map(u => ({ id: u.id, name: u.name, role: u.role, avatar: u.avatar }))
    ];
  }

  db.notifications = await notifications.forUser(me.id);

  res.json({ user: { ...users.publicUser(me), theme: me.theme, accent: me.accent }, db });
};

module.exports = { getState };
