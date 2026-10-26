const KEY = 'acadtrack_v4';
const SESSION = KEY + '_user';

const pad = n => String(n).padStart(2, '0');
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = n => localDate(new Date(Date.now() + n * 864e5));

const stamp = (n, hour, minute) => {
  const d = new Date(Date.now() + n * 864e5);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const formatDate = d => new Date(d + 'T00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const formatStamp = t => {
  const d = new Date(t);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const ICONS = {
  list: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  book: '<path d="M6 4h12v16H6z"/><path d="M6 17h12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/>',
  logout: '<path d="M10 4H5v16h5"/><path d="m15 8 4 4-4 4M19 12H9"/>'
};

const icon = (name, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const seed = () => ({
  counter: 100,

  users: [
    { id: 1, name: 'Ana Admin', email: 'admin@acadtrack.edu', password: '123456', role: 'Admin', active: 1 },
    { id: 2, name: 'Nicezel Jamero', email: 'teacher@acadtrack.edu', password: '123456', role: 'Teacher', active: 1 },
    { id: 3, name: 'Farnker Villaruel', email: 'student@acadtrack.edu', password: '123456', role: 'Student', active: 1 },
    { id: 4, name: 'Leo Reyes', email: 'leo@acadtrack.edu', password: '123456', role: 'Student', active: 1 },
    { id: 5, name: 'Jeric Tan', email: 'jeric@acadtrack.edu', password: '123456', role: 'Teacher', active: 1 },
    { id: 6, name: 'David Yap', email: 'david@acadtrack.edu', password: '123456', role: 'Teacher', active: 1 }
  ],

  classes: [
    { id: 1, code: 'CIS2203N', name: 'CIS 2203N — Mobile Development', schedule: 'Mon / Wed, 9:00–10:30 AM', teacherId: 6, attendanceCode: 'ABC123' },
    { id: 2, code: 'CIS2105', name: 'CIS 2105 — Networking II', schedule: 'Tue / Thu, 1:00–2:30 PM', teacherId: 5, attendanceCode: 'NET105' },
    { id: 3, code: 'IT2204', name: 'IT 2204 — Database Systems', schedule: 'Fri, 8:00–11:00 AM', teacherId: 2, attendanceCode: 'DBS204' },
    { id: 4, code: 'BSIT2A', name: 'BSIT 2 - Section A', schedule: 'Mon / Wed, 9:00–10:30 AM', teacherId: 2, attendanceCode: 'BSIT2A' }
  ],

  enrollments: [[3, 1], [3, 2], [3, 3], [4, 3], [4, 4]],

  assignments: [
    { id: 1, classId: 2, title: 'Algorithms quiz review', description: 'Review the algorithm topics covered before the quiz.', due: day(-3), posted: day(-12), attachment: '', teacherId: 5, deleted: 0 },
    { id: 2, classId: 3, title: 'Database ER diagram', description: 'Draw the ER diagram for the case study.', due: day(-1), posted: day(-10), attachment: 'er_guide.pdf', teacherId: 2, deleted: 0 },
    { id: 3, classId: 2, title: 'Lab report 2', description: 'Write up your findings from the subnetting lab, including the addressing table and a short reflection.', due: day(1), posted: day(-8), attachment: 'lab2_template.docx', teacherId: 5, deleted: 0 },
    { id: 4, classId: 3, title: 'Chapter 4 problem set', description: 'Answer the Chapter 4 problem set.', due: day(2), posted: day(-3), attachment: '', teacherId: 2, deleted: 0 },
    { id: 5, classId: 1, title: 'Essay draft', description: 'Submit the first draft of your essay.', due: day(9), posted: day(-6), attachment: '', teacherId: 6, deleted: 0 },
    { id: 6, classId: 4, title: 'Activity 1', description: 'Complete the assigned activity.', due: day(4), posted: day(-1), attachment: '', teacherId: 2, deleted: 0 }
  ],

  submissions: [
    { id: 1, assignmentId: 1, studentId: 3, status: 'PENDING' },
    { id: 2, assignmentId: 2, studentId: 3, status: 'COMPLETED' },
    { id: 3, assignmentId: 3, studentId: 3, status: 'COMPLETED' },
    { id: 4, assignmentId: 4, studentId: 3, status: 'PENDING' },
    { id: 5, assignmentId: 5, studentId: 3, status: 'PENDING' },
    { id: 6, assignmentId: 2, studentId: 4, status: 'PENDING' },
    { id: 7, assignmentId: 4, studentId: 4, status: 'PENDING' },
    { id: 8, assignmentId: 6, studentId: 4, status: 'PENDING' }
  ],

  notifications: [
    { id: 1, userId: 3, assignmentId: 5, title: 'New assignment posted: Essay draft.', message: 'CIS 2203N — Mobile Development', type: 'NEW', read: 1, at: stamp(-6, 8, 5) },
    { id: 2, userId: 3, assignmentId: 3, title: 'Assignment marked as completed.', message: 'Lab report 2', type: 'DONE', read: 1, at: stamp(-4, 16, 40) },
    { id: 3, userId: 3, assignmentId: 3, title: 'Your teacher updated Lab report 2.', message: 'CIS 2105 — Networking II', type: 'UPDATE', read: 0, at: stamp(-1, 14, 20) },
    { id: 4, userId: 3, assignmentId: 2, title: 'Assignment marked as completed.', message: 'Database ER diagram', type: 'DONE', read: 0, at: stamp(-2, 21, 28) },
    { id: 5, userId: 3, assignmentId: 4, title: 'Chapter 4 problem set is due in 2 days.', message: 'IT 2204 — Database Systems', type: 'REMINDER', read: 0, at: stamp(0, 9, 0) }
  ],

  attendance: []
});

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || seed();
  } catch {
    return seed();
  }
};

let db = load();

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
};

const state = {
  user: null,
  view: '',
  selected: null,
  selectedClass: null,
  modal: null,
  query: '',
  filter: '',
  order: 'soon'
};

const user = id => db.users.find(u => u.id == id);
const klass = id => db.classes.find(c => c.id == id);
const assignment = id => db.assignments.find(a => a.id == id);
const nextId = () => ++db.counter;
const value = id => document.getElementById(id).value;

const displayName = u => (u.role === 'Teacher' ? 'Prof. ' + u.name : u.name);
const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('');
const shortCode = c => c.code.replace(/^([A-Z]+)(?=\d)/, '$1 ');
const unreadCount = () => db.notifications.filter(n => n.userId == state.user.id && !n.read).length;
const signedToday = c => db.attendance.find(x => x.studentId == state.user.id && x.classId == c.id && x.date == day(0));

const myClasses = () =>
  state.user.role === 'Teacher'
    ? db.classes.filter(c => c.teacherId == state.user.id)
    : db.classes.filter(c => db.enrollments.some(e => e[0] == state.user.id && e[1] == c.id));

const statusOf = (a, submission) => {
  if (!submission) return 'Active';
  if (submission.status === 'COMPLETED') return 'Completed';
  return a.due < day(0) ? 'Overdue' : 'Pending';
};

const notify = (userId, assignmentId, title, message, type) =>
  db.notifications.push({
    id: nextId(),
    userId,
    assignmentId,
    title,
    message,
    type,
    read: 0,
    at: new Date().toISOString()
  });

const dueIn = due => {
  const days = Math.round((new Date(due + 'T00:00') - new Date(day(0) + 'T00:00')) / 864e5);
  if (days === 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
};

class Invalid extends Error {}

const required = (...values) => {
  if (!values.every(v => String(v || '').trim())) {
    throw new Invalid('This is a required field.');
  }
};

const assignmentRows = () => {
  const q = state.query.toLowerCase();

  const rows =
    state.user.role === 'Student'
      ? db.submissions
          .filter(s => s.studentId == state.user.id && !assignment(s.assignmentId).deleted)
          .map(s => ({
            a: assignment(s.assignmentId),
            status: statusOf(assignment(s.assignmentId), s)
          }))
      : db.assignments
          .filter(a => a.teacherId == state.user.id && !a.deleted)
          .map(a => ({ a, status: 'Active' }));

  return rows
    .filter(r =>
      (!state.filter || r.status === state.filter) &&
      (r.a.title + klass(r.a.classId).name).toLowerCase().includes(q)
    )
    .sort((x, y) =>
      state.order === 'soon'
        ? x.a.due.localeCompare(y.a.due)
        : y.a.due.localeCompare(x.a.due)
    );
};

const badge = status => `<span class="badge ${status}">${status}</span>`;

const logo = () => `<img src="logo.png" alt=""><span>AcadTrack</span>`;

const field = (id, label, { value = '', type = 'text', placeholder = '', max = 100 } = {}) => `
  <label class="field">
    <span>${label}</span>
    <input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="${max}">
  </label>`;

const NAV = {
  Student: [
    ['assignments', 'Assignments', 'list'],
    ['notifications', 'Notifications', 'bell'],
    ['classes', 'Classes', 'book'],
    ['profile', 'Profile', 'user']
  ],
  Teacher: [
    ['assignments', 'Assignments', 'list'],
    ['notifications', 'Notifications', 'bell'],
    ['profile', 'Profile', 'user']
  ],
  Admin: [
    ['users', 'Users', 'list'],
    ['profile', 'Profile', 'user']
  ]
};

const loginView = () => `
  <div class="login">
    <div class="login-card">
      <div class="login-brand">${logo()}</div>

      ${field('email', 'Email', {
        type: 'email',
        placeholder: 'you@school.edu'
      })}

      ${field('password', 'Password', {
        type: 'password',
        placeholder: '••••••••',
        max: 255
      })}

      <label class="remember">
        <input id="remember" type="checkbox"> Remember me
      </label>

      <button class="btn primary block" data-action="login">Log in</button>

      <hr>

      <p class="demo-title">Try a demo account</p>

      <div class="demo-row">
        <button class="btn" data-action="demo" data-id="student">Student demo</button>
        <button class="btn" data-action="demo" data-id="teacher">Teacher demo</button>
        <button class="btn" data-action="demo" data-id="admin">Admin demo</button>
      </div>
    </div>
  </div>`;

const shell = content => `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">${logo()}</div>

      <nav class="side-nav">
        ${NAV[state.user.role].map(([key, label, ic]) => `
          <button class="nav ${state.view === key || (state.view === 'detail' && key === 'assignments') ? 'active' : ''}"
            data-action="nav" data-id="${key}">
            ${icon(ic)}
            <span>${label}</span>
            ${key === 'notifications' && unreadCount() ? '<i class="dot"></i>' : ''}
          </button>`).join('')}
      </nav>

      <div class="account">
        <span class="avatar">${initials(displayName(state.user))}</span>
        <span class="account-text">
          ${esc(displayName(state.user))}
          <small>${state.user.role}</small>
        </span>
        <button class="icon-btn" data-action="logout" title="Log out">${icon('logout', 20)}</button>
      </div>
    </aside>

    <main>
      <div class="page">${content}</div>
    </main>
  </div>`;

const listHtml = () => {
  const rows = assignmentRows();
  const head = '<div class="table-head"><span>Title</span><span>Due date</span><span>Status</span></div>';

  if (!rows.length) {
    return head + '<p class="empty">No assignments found.</p>';
  }

  return head + rows.map(({ a, status }) => `
    <button class="table-row" data-action="open" data-id="${a.id}">
      <span>
        <b>${esc(a.title)}</b>
        <small>${esc(klass(a.classId).name)}</small>
      </span>
      <span class="due">${formatDate(a.due)}</span>
      ${badge(status)}
    </button>`).join('');
};

const assignmentsView = () => {
  const teacher = state.user.role === 'Teacher';
  const statuses = teacher ? ['Active'] : ['Pending', 'Completed', 'Overdue'];

  return `
    <header class="page-head">
      <div>
        <h1>Assignments</h1>
        <p class="sub">${teacher ? 'Manage what your students see.' : 'Everything due, in one place.'}</p>
      </div>
      ${teacher ? `<button class="btn primary grow" data-action="openPost">${icon('plus', 18)} Post assignment</button>` : ''}
    </header>

    <div class="toolbar">
      <label class="search">
        ${icon('search', 18)}
        <input id="query" placeholder="Search assignments" value="${esc(state.query)}">
      </label>

      <select id="filter">
        <option value="">All statuses</option>
        ${statuses.map(s => `<option ${state.filter === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>

      <select id="order">
        <option value="soon">Due date, soonest</option>
        <option value="late" ${state.order === 'late' ? 'selected' : ''}>Due date, latest</option>
      </select>
    </div>

    <section class="panel" id="list">${listHtml()}</section>`;
};

const detailView = () => {
  const a = assignment(state.selected);
  const submission = db.submissions.find(s => s.assignmentId == a.id && s.studentId == state.user.id);
  const status = statusOf(a, submission);
  const teacher = state.user.role === 'Teacher';

  const doneButton = submission
    ? submission.status === 'PENDING'
      ? `<button class="btn primary" data-action="markDone" data-id="${submission.id}">Mark completed</button>`
      : '<button class="btn" disabled>Completed</button>'
    : '';

  return `
    <button class="back" data-action="nav" data-id="assignments">${icon('back', 18)} Back to assignments</button>

    <section class="card">
      <div class="card-head">
        <div>
          <h1>${esc(a.title)}</h1>
          <p>${esc(klass(a.classId).name)}</p>
        </div>
        ${badge(status)}
      </div>

      <hr class="divider">

      <div class="facts">
        <div>
          <div class="label">Teacher</div>
          <div class="value">${esc(displayName(user(a.teacherId)))}</div>
        </div>
        <div>
          <div class="label">Due date</div>
          <div class="value">${formatDate(a.due)}</div>
        </div>
        <div>
          <div class="label">Date posted</div>
          <div class="value">${formatDate(a.posted)}</div>
        </div>
        <div>
          <div class="label">Status</div>
          <div class="value">${status}</div>
        </div>
      </div>

      <hr class="divider">

      <div class="label">Description</div>
      <p class="description">${esc(a.description)}</p>

      ${a.attachment ? `<span class="chip">${icon('file', 18)}${esc(a.attachment)}</span>` : ''}

      <div class="actions">
        ${teacher ? '<button class="btn" data-action="openEdit">Update</button><button class="btn danger" data-action="openDelete">Delete</button>' : ''}
        ${doneButton}
      </div>
    </section>`;
};

const NOTE_ICONS = {
  REMINDER: 'clock',
  UPDATE: 'pencil',
  NEW: 'plus',
  DONE: 'check'
};

const notificationsView = () => {
  const all = db.notifications
    .filter(n => n.userId == state.user.id)
    .sort((x, y) => y.at.localeCompare(x.at));

  const group = (label, items) => !items.length ? '' : `
    <div class="group-label">${label}</div>
    ${items.map(n => `
      <button class="note ${n.read ? '' : 'unread'}" data-action="readNotification" data-id="${n.id}">
        <span class="tile">${icon(NOTE_ICONS[n.type] || 'bell')}</span>
        <span class="note-text">
          <b>${esc(n.title)}</b>
          <span>${esc(n.message)}</span>
          <small>${formatStamp(n.at)}</small>
        </span>
        ${n.read ? '' : '<i class="dot"></i>'}
      </button>`).join('')}`;

  return `
    <header class="page-head">
      <div>
        <h1>Notifications</h1>
        <p class="sub">Deadlines and updates from your classes.</p>
      </div>
    </header>

    <section class="panel">
      ${all.length
        ? group('Unread', all.filter(n => !n.read)) + group('Read', all.filter(n => n.read))
        : '<p class="empty">You’re all caught up.</p>'}
    </section>`;
};

const classesView = () => `
  <header class="page-head">
    <div>
      <h1>My classes</h1>
      <p class="sub">Classes you’re enrolled in this term.</p>
    </div>
    <button class="btn ghost end" data-action="openAddClass">${icon('plus', 18)} Add class</button>
  </header>

  ${myClasses().map(c => `
    <div class="class-card">
      <div class="info">
        <b>${esc(c.name)}</b>
        <span>${esc(displayName(user(c.teacherId)))}</span>
        <small>${esc(c.schedule)}</small>
      </div>
      <button class="btn" data-action="openAttendance" data-id="${c.id}">
        ${signedToday(c) ? 'Signed' : 'Sign attendance'}
      </button>
    </div>`).join('')}`;

const usersView = () => `
  <header class="page-head">
    <div>
      <h1>Users</h1>
      <p class="sub">Manage accounts and access.</p>
    </div>

    <div class="end">
      <button class="btn" data-action="runReminders">Run deadline check</button>
      <button class="btn primary" data-action="openAddUser">${icon('plus', 18)} Add user</button>
    </div>
  </header>

  <section class="panel">
    ${db.users.map(u => `
      <div class="user-row">
        <div class="info">
          ${esc(u.name)}
          <small>${esc(u.email)}</small>
        </div>
        <span class="role">${u.role}</span>
        ${u.id === state.user.id ? '' : `<button class="btn" data-action="toggleUser" data-id="${u.id}">${u.active ? 'Deactivate' : 'Activate'}</button>`}
      </div>`).join('')}
  </section>

  <p style="margin-top:16px">
    <button class="btn ghost" data-action="resetData">Reset demo data</button>
  </p>`;

const profileView = () => `
  <header class="page-head">
    <div>
      <h1>Profile</h1>
      <p class="sub">Your account details.</p>
    </div>
  </header>

  <section class="card">
    <div class="label">Name</div>
    <div class="value">${esc(displayName(state.user))}</div>
    <hr class="divider">
    <div class="label">Email</div>
    <div class="value">${esc(state.user.email)}</div>
    <hr class="divider">
    <div class="label">Role</div>
    <div class="value">${state.user.role}</div>
  </section>`;

const PAGES = {
  assignments: assignmentsView,
  detail: detailView,
  notifications: notificationsView,
  classes: classesView,
  users: usersView,
  profile: profileView
};

const modal = (title, body, actions) => `
  <div class="overlay">
    <div class="modal" role="dialog">
      <div class="modal-head">
        <h2>${title}</h2>
        <button class="close" data-action="close" aria-label="Close">${icon('close', 18)}</button>
      </div>
      ${body}
      <div class="modal-actions">${actions}</div>
    </div>
  </div>`;

const CANCEL = '<button class="btn" data-action="close">Cancel</button>';

const assignmentModal = editing => {
  const a = editing ? assignment(state.selected) : {};
  const options = myClasses().map(c =>
    `<option value="${c.id}" ${a.classId == c.id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');

  return modal(
    editing ? 'Update assignment' : 'Post assignment',
    `${field('title', 'Assignment title', { value: a.title, placeholder: 'e.g. Chapter 5 problem set' })}
     <label class="field">
       <span>Class / subject</span>
       <select id="classId">${options}</select>
     </label>
     <label class="field">
       <span>Description / instructions</span>
       <textarea id="description" maxlength="1000" placeholder="What should students do?">${esc(a.description)}</textarea>
     </label>
     ${field('due', 'Due date', { value: a.due, type: 'date' })}
     ${field('attachment', 'Attachment / resource (optional)', { value: a.attachment, placeholder: 'e.g. rubric.pdf or a link', max: 255 })}`,
    CANCEL + `<button class="btn primary" data-action="${editing ? 'saveEdit' : 'savePost'}">${editing ? 'Save changes' : 'Post assignment'}</button>`
  );
};

const attendanceModal = () => {
  const c = klass(state.selectedClass);
  const signed = signedToday(c);

  return modal(
    'Sign attendance',
    `<p class="modal-text">Sign attendance for <b>${esc(shortCode(c))}</b>?</p>
     <div class="status-box">
       <span>Status</span>
       <span>${signed ? signed.status : 'Not signed'}</span>
     </div>
     ${signed ? '' : field('attendanceCode', 'Attendance code', { placeholder: 'e.g. ABC123', max: 50 }) + `<p class="modal-hint">Demo code: ${esc(c.attendanceCode)}</p>`}`,
    signed
      ? '<button class="btn primary" data-action="close">OK</button>'
      : CANCEL + '<button class="btn primary" data-action="saveAttendance">Sign attendance</button>'
  );
};

const modalHtml = () => {
  switch (state.modal) {
    case 'post':
      return assignmentModal(false);

    case 'edit':
      return assignmentModal(true);

    case 'delete':
      return modal(
        'Delete assignment?',
        '<p class="modal-text">This removes it for all students.</p>',
        CANCEL + '<button class="btn primary" data-action="confirmDelete">Delete</button>'
      );

    case 'addClass':
      return modal(
        'Add class',
        `${field('classCode', 'Class code', { placeholder: 'e.g. CIS2203N', max: 50 })}
         <p class="modal-hint">Ask your teacher for the class code. Demo code: BSIT2A</p>`,
        CANCEL + '<button class="btn primary" data-action="saveClass">Add</button>'
      );

    case 'addUser':
      return modal(
        'Add user',
        `${field('name', 'Full name')}${field('newEmail', 'Email', { type: 'email' })}
         <label class="field">
           <span>Role</span>
           <select id="role">
             <option>Student</option>
             <option>Teacher</option>
             <option>Admin</option>
           </select>
         </label>
         <p class="modal-hint">Default password: 123456</p>`,
        CANCEL + '<button class="btn primary" data-action="saveUser">Save</button>'
      );

    case 'attendance':
      return attendanceModal();

    default:
      return '';
  }
};

const render = () => {
  document.getElementById('app').innerHTML =
    state.user ? shell(PAGES[state.view]()) + modalHtml() : loginView();
};

let toastTimer;

const toast = (message, bad = false) => {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 2600);
};

const enter = u => {
  state.user = u;
  state.view = u.role === 'Admin' ? 'users' : 'assignments';
};

const readAssignmentForm = () => {
  const form = {
    title: value('title').trim(),
    description: value('description').trim(),
    due: value('due'),
    classId: +value('classId'),
    attachment: value('attachment').trim()
  };

  required(form.title, form.description, form.due, form.classId);
  return form;
};

const actions = {
  login() {
    const email = value('email').trim().toLowerCase();
    const password = value('password');

    required(email, password);

    const found = db.users.find(
      u => u.email === email && u.password === password && u.active
    );

    if (!found) {
      throw new Invalid('Invalid email or password.');
    }

    enter(found);

    try {
      (document.getElementById('remember').checked ? localStorage : sessionStorage)
        .setItem(SESSION, found.id);
    } catch {}
  },

  // Demo buttons only fill the email and password fields.
  // They do not log in automatically.
  demo(role) {
    document.getElementById('email').value = `${role}@acadtrack.edu`;
    document.getElementById('password').value = '123456';
  },

  logout() {
    try {
      localStorage.removeItem(SESSION);
      sessionStorage.removeItem(SESSION);
    } catch {}

    state.user = null;
    state.modal = null;
  },

  nav(view) {
    state.view = view;
    state.modal = null;
  },

  open(id) {
    state.selected = +id;
    state.view = 'detail';
  },

  close() {
    state.modal = null;
  },

  openPost() {
    state.modal = 'post';
  },

  openEdit() {
    state.modal = 'edit';
  },

  openDelete() {
    state.modal = 'delete';
  },

  savePost() {
    const form = readAssignmentForm();

    const a = {
      id: nextId(),
      ...form,
      posted: day(0),
      teacherId: state.user.id,
      deleted: 0
    };

    db.assignments.push(a);

    db.enrollments
      .filter(e => e[1] === form.classId)
      .forEach(([studentId]) => {
        db.submissions.push({
          id: nextId(),
          assignmentId: a.id,
          studentId,
          status: 'PENDING'
        });

        notify(
          studentId,
          a.id,
          `New assignment posted: ${a.title}.`,
          klass(form.classId).name,
          'NEW'
        );
      });

    state.modal = null;
    toast('Assignment posted');
  },

  saveEdit() {
    const a = assignment(state.selected);
    Object.assign(a, readAssignmentForm());

    db.submissions
      .filter(s => s.assignmentId == a.id)
      .forEach(s => notify(
        s.studentId,
        a.id,
        `Your teacher updated ${a.title}.`,
        klass(a.classId).name,
        'UPDATE'
      ));

    state.modal = null;
    toast('Assignment updated');
  },

  confirmDelete() {
    assignment(state.selected).deleted = 1;
    state.modal = null;
    state.view = 'assignments';
    toast('Assignment deleted');
  },

  markDone(id) {
    const submission = db.submissions.find(s => s.id == id);

    if (!submission || submission.studentId != state.user.id) {
      return;
    }

    submission.status = 'COMPLETED';

    const a = assignment(submission.assignmentId);

    notify(
      state.user.id,
      a.id,
      'Assignment marked as completed.',
      a.title,
      'DONE'
    );

    toast('Marked as completed');
  },

  readNotification(id) {
    const notification = db.notifications.find(n => n.id == id);
    if (notification) notification.read = 1;
  },

  openAddClass() {
    state.modal = 'addClass';
  },

  saveClass() {
    const code = value('classCode').replace(/\s+/g, '').toUpperCase();

    required(code);

    const c = db.classes.find(c => c.code === code);

    if (!c) {
      throw new Invalid('Class code not found.');
    }

    if (db.enrollments.some(e => e[0] == state.user.id && e[1] == c.id)) {
      throw new Invalid('You are already enrolled in this class.');
    }

    db.enrollments.push([state.user.id, c.id]);
    state.modal = null;
    toast('Class added');
  },

  openAttendance(id) {
    state.selectedClass = +id;
    state.modal = 'attendance';
  },

  saveAttendance() {
    const code = value('attendanceCode').trim();

    required(code);

    const c = klass(state.selectedClass);

    if (code.toUpperCase() !== c.attendanceCode) {
      throw new Invalid('Invalid attendance code.');
    }

    db.attendance.push({
      studentId: state.user.id,
      classId: c.id,
      date: day(0),
      status: 'Present'
    });

    state.modal = null;
    toast('Attendance recorded');
  },

  openAddUser() {
    state.modal = 'addUser';
  },

  saveUser() {
    const email = value('newEmail').trim().toLowerCase();

    required(value('name'), email);

    if (db.users.some(u => u.email === email)) {
      throw new Invalid('That email is already in use.');
    }

    db.users.push({
      id: nextId(),
      name: value('name').trim(),
      email,
      password: '123456',
      role: value('role'),
      active: 1
    });

    state.modal = null;
    toast('User added');
  },

  toggleUser(id) {
    const u = user(id);
    if (u) u.active = u.active ? 0 : 1;
  },

  runReminders() {
    let sent = 0;

    db.assignments
      .filter(a => !a.deleted && a.due >= day(0) && a.due <= day(2))
      .forEach(a => {
        db.submissions
          .filter(s => s.assignmentId == a.id && s.status === 'PENDING')
          .forEach(s => {
            const exists = db.notifications.some(
              n => n.userId == s.studentId &&
                   n.assignmentId == a.id &&
                   n.type === 'REMINDER'
            );

            if (exists) return;

            notify(
              s.studentId,
              a.id,
              `${a.title} is due ${dueIn(a.due)}.`,
              klass(a.classId).name,
              'REMINDER'
            );

            sent++;
          });
      });

    toast(`${sent} reminder(s) sent`);
  },

  resetData() {
    db = seed();
    state.modal = null;
    toast('Demo data reset');
  }
};

const run = (name, id) => {
  try {
    actions[name](id);
  } catch (e) {
    if (e instanceof Invalid) {
      return toast(e.message, true);
    }

    throw e;
  }

  // IMPORTANT: Do not re-render after a demo click.
  // Re-rendering would clear the email and password fields.
  if (name === 'demo') {
    return;
  }

  save();
  render();
};

document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');

  if (target && actions[target.dataset.action]) {
    run(target.dataset.action, target.dataset.id);
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'query') return;

  state.query = e.target.value;

  const list = document.getElementById('list');
  if (list) {
    list.innerHTML = listHtml();
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'filter') {
    state.filter = e.target.value;
  } else if (e.target.id === 'order') {
    state.order = e.target.value;
  } else {
    return;
  }

  render();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !state.user) {
    run('login');
  }
});

try {
  const saved = localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION);
  const found = saved && db.users.find(u => u.id == saved && u.active);

  if (found) {
    enter(found);
  }
} catch {}

render();
function resetDemo() {
  if (confirm("Reset AcadTrack to its original demo state?")) {
    localStorage.removeItem("acadtrack_v4");
    location.reload();
  }
}
