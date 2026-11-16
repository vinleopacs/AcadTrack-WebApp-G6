const express = require('express');
const rateLimit = require('express-rate-limit');
const { wrap } = require('../utils/errors');
const { requireLogin, requireRole, jsonOnly } = require('../middleware/auth');
const auth = require('../controllers/authController');
const state = require('../controllers/stateController');
const classes = require('../controllers/classController');
const attendance = require('../controllers/attendanceController');
const assignments = require('../controllers/assignmentController');
const materials = require('../controllers/materialController');
const users = require('../controllers/userController');

const router = express.Router();

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});

router.use(jsonOnly);

router.get('/config', auth.config);
router.post('/login', loginLimit, wrap(auth.adminLogin));
router.post('/auth/google', loginLimit, wrap(auth.googleLogin));
router.post('/logout', auth.logout);

router.get('/state', requireLogin, wrap(state.getState));

router.post('/classes', requireRole('Teacher'), wrap(classes.create));
router.post('/classes/join', requireRole('Student'), wrap(classes.join));
router.post('/classes/:id/roster', requireRole('Teacher'), wrap(classes.roster));
router.post('/study-load', requireRole('Student'), wrap(classes.studyLoad));
router.post('/demo-class', requireRole('Student'), wrap(classes.demoTimes));

router.post('/attendance', requireRole('Student'), wrap(attendance.sign));

router.post('/assignments', requireRole('Teacher'), wrap(assignments.create));
router.put('/assignments/:id', requireRole('Teacher'), wrap(assignments.update));
router.delete('/assignments/:id', requireRole('Teacher'), wrap(assignments.remove));
router.post('/submissions/:id/complete', requireRole('Student'), wrap(assignments.complete));

router.post('/materials', requireRole('Teacher'), wrap(materials.create));
router.delete('/materials/:id', requireRole('Teacher'), wrap(materials.remove));
router.get('/materials/:id/file', requireLogin, wrap(materials.download));

router.post('/notifications/:id/read', requireLogin, wrap(users.readNotification));

router.post('/users', requireRole('Admin'), wrap(users.create));
router.post('/users/:id/toggle', requireRole('Admin'), wrap(users.toggle));
router.post('/reminders/run', requireRole('Admin'), wrap(users.runReminders));

module.exports = router;
