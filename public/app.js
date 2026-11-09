
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
  logout: '<path d="M10 4H5v16h5"/><path d="m15 8 4 4-4 4M19 12H9"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'
};

const icon = (name, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let db = { users: [], classes: [], enrollments: [], assignments: [], submissions: [], notifications: [], attendance: [], materials: [] };

let config = { googleClientId: '', domain: 'usc.edu.ph', demo: false };

const state = {
  user: null,
  view: '',
  selected: null,
  selectedClass: null,
  modal: null,
  query: '',
  filter: '',
  order: 'soon',
  seen: null
};

class Invalid extends Error {}

const api = async (method, path, body) => {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== '/login') {
    state.user = null;
  }

  if (!res.ok) {
    throw new Invalid(data.error || 'Something went wrong. Please try again.');
  }

  return data;
};

const user = id => db.users.find(u => u.id == id);
const klass = id => db.classes.find(c => c.id == id);
const assignment = id => db.assignments.find(a => a.id == id);
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

const DAYS = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sat: 6 };

const toMin = t => {
  const [, h, m, ap] = t.match(/(\d+):(\d+)\s*([AP])M/);
  return (h % 12 + (ap === 'P' ? 12 : 0)) * 60 + +m;
};

const fmtMin = m => `${(Math.floor(m / 60) + 11) % 12 + 1}:${pad(m % 60)} ${m < 720 ? 'AM' : 'PM'}`;

const fixOcr = text => text.replace(
  /\b([\dOoIl]{1,2})\s*[:.]\s*([\dOoIl]{2})\s*([AaPp])\.?\s*[Mm]\b/g,
  (_, h, m, ap) => `${h.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')}:${m.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')} ${ap.toUpperCase()}M`
);

const parseStudyLoad = text => fixOcr(text).split('\n').map(line => {
  const m = line.match(/\b((?:Sat|Su|Th|M|T|W|F)(?:\s*(?:Sat|Su|Th|M|T|W|F))*)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[AP]M)\s+(\S+)/);
  if (!m) return null;
  const before = line.slice(0, m.index);
  const code = before.match(/[A-Z]{2,}(?:-[A-Z]+)?\s+(?:[A-Z]+-)?[A-Z\d]+(?=\s*$)/);
  const group = before.match(/^\s*(\d+)/);
  return {
    group: group ? group[1] : '',
    code: code ? code[0] : before.replace(/^\s*\d+\s+/, '').trim(),
    dayText: m[1].match(/Sat|Su|Th|M|T|W|F/g).join(' '),
    days: m[1].match(/Sat|Su|Th|M|T|W|F/g).map(d => DAYS[d]),
    start: toMin(m[2]),
    end: toMin(m[3]),
    room: m[4],
    faculty: line.slice(m.index + m[0].length).replace(/\s+\d+\.\d+\b.*$/, '').replace(/^\s*TC\b/, '').replace(/[.\s]+$/, '').trim()
  };
}).filter(r => r && r.code);

const nowMin = () => new Date().getHours() * 60 + new Date().getMinutes();

const classTime = c => `${c.dayText}, ${fmtMin(c.start)} – ${fmtMin(c.end)}`;

const statusOf = (a, submission) => {
  if (!submission) return 'Active';
  if (submission.status === 'COMPLETED') return 'Completed';
  return a.due < day(0) ? 'Overdue' : 'Pending';
};

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
          .filter(s => s.studentId == state.user.id && assignment(s.assignmentId))
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
    ['attendance', 'Attendance', 'check'],
    ['classes', 'Classes', 'book'],
    ['profile', 'Profile', 'user']
  ],
  Teacher: [
    ['assignments', 'Assignments', 'list'],
    ['notifications', 'Notifications', 'bell'],
    ['classes', 'Classes', 'book'],
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

      <p class="demo-title">Students and professors: sign in with your @${esc(config.domain)} Google account.</p>
      <div id="googleBtn" class="google-btn">${config.googleClientId ? '' : '<p class="modal-hint">Google sign-in is not set up yet.</p>'}</div>

      <hr>

      <details class="admin-login">
        <summary>Admin login</summary>

        ${field('email', 'Email', { type: 'email', placeholder: 'admin@school.edu' })}
        ${field('password', 'Password', { type: 'password', placeholder: '••••••••', max: 255 })}

        <label class="remember">
          <input id="showPw" type="checkbox"> Show password
        </label>

        <label class="remember">
          <input id="remember" type="checkbox"> Remember me
        </label>

        <button class="btn primary block" data-action="login">Log in</button>
      </details>
    </div>
  </div>`;

const shell = content => `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">${logo()}</div>

      <nav class="side-nav">
        ${NAV[state.user.role].map(([key, label, ic]) => `
          <button class="nav ${state.view === key || (state.view === 'detail' && key === 'assignments') || (state.view === 'classDetail' && key === 'classes') ? 'active' : ''}"
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
          <div class="value">${esc(user(a.teacherId) ? displayName(user(a.teacherId)) : '—')}</div>
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
  DONE: 'check',
  CLASS: 'book',
  MATERIAL: 'file'
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

const genCode = () => {
  let code;
  do {
    code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  } while (db.classes.some(c => c.joinCode === code));
  return code;
};

const studentsOf = c => db.enrollments.filter(e => e[1] == c.id).map(e => user(e[0])).filter(Boolean);

const teacherClassesView = () => `
  <header class="page-head">
    <div>
      <h1>My classes</h1>
      <p class="sub">Create a class, upload your class list, and share the join code.</p>
    </div>
    <button class="btn primary end" data-action="openNewClass">${icon('plus', 18)} New class</button>
  </header>

  ${myClasses().map(c => `
    <div class="class-card">
      <div class="info">
        <b>${esc(c.name)}${c.group ? ` · Group ${esc(c.group)}` : ''}</b>
        <span>Join code: <b class="join">${esc(c.joinCode || c.code)}</b> · ${studentsOf(c).length} students</span>
        <small>${esc(c.schedule)}</small>
      </div>
      <button class="btn" data-action="openRoster" data-id="${c.id}">Upload class list</button>
      <button class="btn" data-action="openClassDetail" data-id="${c.id}">View</button>
    </div>`).join('') || '<p class="empty">No classes yet. Click New class to create one.</p>'}`;

const safeLink = url => (/^https?:\/\//i.test(url) ? url : '');

const classDetailView = () => {
  const c = klass(state.selectedClass);
  const teacher = state.user.role === 'Teacher';
  const items = db.materials
    .filter(m => m.classId == c.id)
    .sort((x, y) => y.posted.localeCompare(x.posted));

  return `
    <button class="back" data-action="nav" data-id="classes">${icon('back', 18)} Back to classes</button>

    <header class="page-head">
      <div>
        <h1>${esc(c.name)}${c.group ? ` · Group ${esc(c.group)}` : ''}</h1>
        <p class="sub">${esc(c.schedule)}${teacher ? ` · Join code: <b class="join">${esc(c.joinCode || c.code)}</b> · ${studentsOf(c).length} students` : ''}</p>
      </div>
      ${teacher ? `<div class="end">
        <button class="btn" data-action="openRoster" data-id="${c.id}">Upload class list</button>
        <button class="btn primary" data-action="openMaterial">${icon('plus', 18)} Add material</button>
      </div>` : ''}
    </header>

    <div class="group-label">Study materials</div>
    <section class="panel">
      ${items.length ? items.map(m => `
        <div class="material">
          <span class="tile">${icon('file')}</span>
          <div class="info">
            <b>${esc(m.title)}</b>
            ${m.note ? `<span>${esc(m.note)}</span>` : ''}
            <small>Posted ${formatDate(m.posted)}</small>
            <div class="links">
              ${m.hasFile ? `<a class="chip" href="/api/materials/${m.id}/file" download="${esc(m.fileName)}">${icon('file', 16)}${esc(m.fileName)}</a>` : ''}
              ${safeLink(m.link) ? `<a class="chip" href="${esc(m.link)}" target="_blank" rel="noopener">${icon('link', 16)}Open link</a>` : ''}
            </div>
          </div>
          ${teacher ? `<button class="btn danger" data-action="deleteMaterial" data-id="${m.id}">Delete</button>` : ''}
        </div>`).join('') : `<p class="empty">${teacher ? 'No materials yet. Click Add material to upload one.' : 'Your professor hasn’t posted any materials yet.'}</p>`}
    </section>`;
};

const classesView = () => state.user.role === 'Teacher' ? teacherClassesView() : `
  <header class="page-head">
    <div>
      <h1>My classes</h1>
      <p class="sub">Classes you’re enrolled in this term.</p>
    </div>
    <div class="end">
      <button class="btn ghost" data-action="openLoad">${icon('file', 18)} Upload study load</button>
      <button class="btn ghost" data-action="openAddClass">${icon('plus', 18)} Add class</button>
    </div>
  </header>

  ${myClasses().map(c => `
    <div class="class-card">
      <div class="info">
        <b>${esc(c.name)}</b>
        <span>${esc(user(c.teacherId) ? displayName(user(c.teacherId)) : c.faculty)}</span>
        <small>${esc(c.schedule)}</small>
      </div>
      <button class="btn" data-action="openClassDetail" data-id="${c.id}">Materials (${db.materials.filter(m => m.classId == c.id).length})</button>
    </div>`).join('')}`;

const ATT = { Present: 'present', Absent: 'absent', Excused: 'excused', 'No Class': 'noclass' };

const attPill = status => `<span class="att ${ATT[status]}">${esc(status)}</span>`;

const rateOf = records => {
  const present = records.filter(a => a.status === 'Present').length;
  const counted = present + records.filter(a => a.status === 'Absent').length;
  return counted ? Math.round(present / counted * 100) : null;
};

const rateLevel = r => (r === null ? '' : r >= 90 ? 'good' : r >= 80 ? 'warn' : 'bad');

const countsOf = records => Object.keys(ATT)
  .map(k => `<span>${attPill(k)} ${records.filter(a => a.status === k).length}</span>`)
  .join('');

const calendarHtml = mine => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + (state.calMonth || 0), 1);
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');

  for (let d = 1; d <= total; d++) {
    const date = localDate(new Date(first.getFullYear(), first.getMonth(), d));
    const recs = mine.filter(a => a.date === date);
    const tip = recs.map(a => `${klass(a.classId).name}: ${a.status}`).join('\n');
    cells.push(`
      <span class="cal-day ${date === day(0) ? 'today' : ''}" title="${esc(tip)}">
        <b>${d}</b>
        <i>${recs.map(a => `<em class="${ATT[a.status]}"></em>`).join('')}</i>
      </span>`);
  }

  return `
    <div class="cal-head">
      <button class="btn ghost" data-action="calMonth" data-id="-1">${icon('back', 16)}</button>
      <b>${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b>
      <button class="btn ghost flip" data-action="calMonth" data-id="1">${icon('back', 16)}</button>
    </div>
    <div class="cal">
      ${['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map(w => `<small>${w}</small>`).join('')}
      ${cells.join('')}
    </div>
    <p class="cal-legend">${Object.keys(ATT).map(k => `<span><em class="${ATT[k]}"></em>${k}</span>`).join('')}</p>`;
};

const attendanceView = () => {
  const today = myClasses().filter(c => !c.days || c.days.includes(new Date().getDay()));
  const history = db.attendance
    .filter(a => a.studentId == state.user.id)
    .sort((x, y) => y.date.localeCompare(x.date));
  const rate = rateOf(history);

  return `
    <header class="page-head">
      <div>
        <h1>Attendance</h1>
        <p class="sub">Sign in once your class starts. You can sign until 11:59 PM that day.</p>
      </div>
    </header>

    <section class="panel tracker">
      <div class="rate ${rateLevel(rate)}">
        <b>${rate === null ? '—' : rate + '%'}</b>
        <span>Attendance rate</span>
        <small>Present ÷ (Present + Absent). Excused and No Class don't count against you.</small>
      </div>
      <div class="counts">${countsOf(history)}</div>
    </section>

    <div class="group-label">Today</div>
    ${today.length ? today.map(c => `
      <div class="class-card">
        <div class="info">
          <b>${esc(c.name)}</b>
          <span>${esc(user(c.teacherId) ? displayName(user(c.teacherId)) : c.faculty)}</span>
          <small>${esc(c.schedule)}</small>
          ${c.isDemo ? `
            <div class="demo-row demo-class">
              <button class="btn" data-action="demoClass" data-id="now">Start now</button>
              <button class="btn" data-action="demoClass" data-id="soon">Start in 2 min</button>
              <button class="btn" data-action="demoClass" data-id="day">All day</button>
            </div>` : ''}
        </div>
        <button class="btn" data-action="openAttendance" data-id="${c.id}">
          ${signedToday(c) ? signedToday(c).status : 'Sign attendance'}
        </button>
      </div>`).join('') : '<p class="empty">No classes today.</p>'}

    <div class="group-label">By class</div>
    <section class="panel">
      ${myClasses().map(c => {
        const recs = history.filter(a => a.classId == c.id);
        const r = rateOf(recs);
        return `
          <div class="class-rate">
            <span class="name">${esc(c.name)}<small>${recs.length} signed</small></span>
            <span class="bar"><i class="${rateLevel(r)}" style="width:${r || 0}%"></i></span>
            <b>${r === null ? '—' : r + '%'}</b>
          </div>`;
      }).join('') || '<p class="empty">No classes yet.</p>'}
    </section>

    <div class="group-label">Calendar</div>
    <section class="panel calendar">${calendarHtml(history)}</section>

    <div class="group-label">History</div>
    <section class="panel">
      ${history.length ? `<table class="load-table">
        <tr><th>Date</th><th>Class</th><th>Status</th></tr>
        ${history.map(a => `<tr><td>${formatDate(a.date)}</td><td>${esc(klass(a.classId).name)}</td><td>${attPill(a.status)}</td></tr>`).join('')}
      </table>` : '<p class="empty">No attendance yet.</p>'}
    </section>`;
};

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
`;

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
  classDetail: classDetailView,
  attendance: attendanceView,
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
     ${c.days ? `<p class="modal-hint">Class time: ${esc(classTime(c))}. You can sign from the start of class until 11:59 PM today.</p>` : ''}
     <div class="status-box">
       <span>Status</span>
       <span>${signed ? signed.status : 'Not signed'}</span>
     </div>
     ${signed ? '' : `<label class="field">
       <span>Attendance</span>
       <select id="attStatus">
         <option>Present</option>
         <option>Absent</option>
         <option>Excused</option>
         <option>No Class</option>
       </select>
     </label>`}
     ${signed || !c.hasCode ? '' : field('attendanceCode', 'Attendance code', { placeholder: 'e.g. ABC123', max: 50 })}`,
    signed
      ? '<button class="btn primary" data-action="close">OK</button>'
      : CANCEL + '<button class="btn primary" data-action="saveAttendance">Sign attendance</button>'
  );
};

const studyLoadModal = () => modal(
  'Upload study load',
  state.loadRows
    ? `<table class="load-table">
         <tr><th>Course</th><th>Schedule</th><th>Room</th><th>Faculty</th></tr>
         ${state.loadRows.map(r => `<tr><td>${esc(r.code)}</td><td>${esc(r.dayText)} ${fmtMin(r.start)} – ${fmtMin(r.end)}</td><td>${esc(r.room)}</td><td>${esc(r.faculty)}</td></tr>`).join('')}
       </table>
       <p class="modal-hint">Check your subjects before saving. Missing one? Cancel and paste the text instead.</p>`
    : `<label class="field">
         <span>Study load</span>
         <textarea id="studyLoad" placeholder="Paste your study load here"></textarea>
       </label>
       <p class="modal-hint">Open your study load on the school portal, select the whole table, copy it and paste it here.</p>
       <label class="field">
         <span>Or upload a screenshot</span>
         <input id="loadImage" type="file" accept="image/*">
       </label>`,
  CANCEL + (state.loadRows
    ? '<button class="btn primary" data-action="saveLoad">Save classes</button>'
    : '<button class="btn primary" data-action="previewLoad">Preview</button>')
);

const newClassModal = () => modal(
  'New class',
  `${field('newCode', 'Course code', { placeholder: 'e.g. IT 3105N', max: 30 })}
   ${field('newGroup', 'Group #', { placeholder: 'e.g. 3', max: 5 })}
   ${field('newTitle', 'Course title (optional)', { placeholder: 'e.g. App Dev and Emerging Tech' })}
   ${field('newDays', 'Days', { placeholder: 'e.g. M W or T Th or Sat', max: 30 })}
   ${field('newStart', 'Start time', { type: 'time' })}
   ${field('newEnd', 'End time', { type: 'time' })}
   ${field('newRoom', 'Room', { placeholder: 'e.g. LB445TC', max: 30 })}`,
  CANCEL + '<button class="btn primary" data-action="saveNewClass">Create class</button>'
);

const rosterModal = () => {
  const c = klass(state.selectedClass);
  const r = state.rosterResult;

  if (r) {
    return modal(
      'Class list uploaded',
      `<p class="modal-text"><b>${r.added}</b> added · <b>${r.already}</b> already in class · <b>${r.missing.length}</b> without accounts</p>
       ${r.missing.length ? `<p class="modal-hint">These students don't have accounts yet. Once they make one, they can join using the code <b class="join">${esc(c.joinCode || c.code)}</b>:</p>
       <div class="missing">${r.missing.map(m => `<div>${esc(m)}</div>`).join('')}</div>` : ''}`,
      '<button class="btn primary" data-action="close">Done</button>'
    );
  }

  return modal(
    `Upload class list · ${esc(c.name)}`,
    `<label class="field">
       <span>CSV file</span>
       <input id="rosterFile" type="file" accept=".csv,.txt">
     </label>
     <label class="field">
       <span>Or paste the list</span>
       <textarea id="rosterText" placeholder="Name,Email&#10;Juan Dela Cruz,22100001@usc.edu.ph"></textarea>
     </label>
     <p class="modal-hint">Any format works as long as each student has an email. Students with accounts are added right away.</p>`,
    CANCEL + '<button class="btn primary" data-action="saveRoster">Add students</button>'
  );
};

const materialModal = () => modal(
  'Add study material',
  `${field('matTitle', 'Title', { placeholder: 'e.g. Chapter 3 slides' })}
   <label class="field">
     <span>Note (optional)</span>
     <textarea id="matNote" maxlength="500" placeholder="What should students do with this?"></textarea>
   </label>
   <label class="field">
     <span>File (optional, up to 5 MB)</span>
     <input id="matFile" type="file">
   </label>
   ${field('matLink', 'Link (optional)', { placeholder: 'https://…', max: 500 })}
   <p class="modal-hint">Add a file, a link, or both.</p>`,
  CANCEL + '<button class="btn primary" data-action="saveMaterial">Post material</button>'
);

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
        `${field('classCode', 'Join code', { placeholder: 'e.g. K7P2QX', max: 50 })}
         <p class="modal-hint">Ask your professor for the class join code.</p>`,
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
         ${field('newPassword', 'Password (Admin accounts only)', { type: 'password', max: 255 })}
         <p class="modal-hint">Students and professors sign in with Google, so they don't need a password. Add professors here before they sign in; anyone else with a school account becomes a Student.</p>`,
        CANCEL + '<button class="btn primary" data-action="saveUser">Save</button>'
      );

    case 'attendance':
      return attendanceModal();

    case 'studyLoad':
      return studyLoadModal();

    case 'newClass':
      return newClassModal();

    case 'roster':
      return rosterModal();

    case 'material':
      return materialModal();

    default:
      return '';
  }
};

const render = () => {
  document.getElementById('app').innerHTML = state.user ? shell(PAGES[state.view]()) + modalHtml() : loginView();

  if (!state.user) {
    showGoogleButton();
  }
};

const loadScript = src => new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = ok;
  s.onerror = fail;
  document.head.append(s);
});

const showGoogleButton = async () => {
  const box = document.getElementById('googleBtn');
  if (!box || !config.googleClientId) return;

  try {
    if (!window.google?.accounts) {
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        hd: config.domain,
        callback: r => run('google', r.credential)
      });
    }

    google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' });
  } catch {
    box.innerHTML = '<p class="modal-hint">Could not load Google sign-in. Check your connection and refresh.</p>';
  }
};


const readImage = async file => {
  if (!window.Tesseract) {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  }

  const img = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 3000 / img.width));
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const worker = await Tesseract.createWorker('eng');
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK });
  const { data } = await worker.recognize(canvas);
  await worker.terminate();
  return data.text;
};

let toastTimer;

const toast = (message, bad = false) => {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 2600);
};

const refresh = async () => {
  try {
    const data = await api('GET', '/state');
    const first = !state.user || state.user.id !== data.user.id;

    db = data.db;
    state.user = data.user;

    if (first) {
      state.view = data.user.role === 'Admin' ? 'users' : 'assignments';
      state.seen = new Set(db.notifications.map(n => n.id));
    }

    announce();
  } catch {
    state.user = null;
  }
};

const announce = () => {
  const fresh = db.notifications.filter(n => !state.seen.has(n.id));
  fresh.forEach(n => state.seen.add(n.id));

  const cls = fresh.find(n => n.type === 'CLASS');
  if (!cls) return;

  toast(cls.title);

  try {
    if (window.Notification && Notification.permission === 'granted') new Notification(cls.title, { body: cls.message });
  } catch {}
};

const busy = () => {
  const el = document.activeElement;
  return state.modal || (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
};

setInterval(async () => {
  if (!state.user || busy()) return;
  await refresh();
  render();
}, 30000);


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
  async login() {
    const email = value('email').trim().toLowerCase();
    const password = value('password');

    required(email, password);
    await api('POST', '/login', { email, password, remember: document.getElementById('remember').checked });
  },

  async google(credential) {
    await api('POST', '/auth/google', { credential });
  },

  async logout() {
    await api('POST', '/logout', {});
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
    state.loadRows = null;
    state.rosterResult = null;
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

  async savePost() {
    await api('POST', '/assignments', readAssignmentForm());
    state.modal = null;
    toast('Assignment posted');
  },

  async saveEdit() {
    await api('PUT', `/assignments/${state.selected}`, readAssignmentForm());
    state.modal = null;
    toast('Assignment updated');
  },

  async confirmDelete() {
    await api('DELETE', `/assignments/${state.selected}`, {});
    state.modal = null;
    state.view = 'assignments';
    toast('Assignment deleted');
  },

  async markDone(id) {
    await api('POST', `/submissions/${id}/complete`, {});
    toast('Marked as completed');
  },

  async readNotification(id) {
    await api('POST', `/notifications/${id}/read`, {});
  },

  openAddClass() {
    state.modal = 'addClass';
  },

  async saveClass() {
    const code = value('classCode').trim();
    required(code);
    await api('POST', '/classes/join', { code });
    state.modal = null;
    toast('Class added');
  },

  openLoad() {
    state.modal = 'studyLoad';
    state.loadRows = null;
  },

  previewLoad() {
    const rows = parseStudyLoad(value('studyLoad'));

    if (!rows.length) {
      throw new Invalid('No subjects found. Copy the whole study load table and paste it again.');
    }

    state.loadRows = rows;
  },

  async saveLoad() {
    await api('POST', '/study-load', { rows: state.loadRows });

    try {
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
    } catch {}

    toast(`${state.loadRows.length} classes added from your study load`);
    state.modal = null;
    state.loadRows = null;
  },

  calMonth(step) {
    state.calMonth = (state.calMonth || 0) + +step;
  },

  async demoClass(mode) {
    const t = await api('POST', '/demo-class', { mode });
    toast(`Demo class set: ${fmtMin(t.start)} – ${fmtMin(t.end)}`);
  },

  openAttendance(id) {
    state.selectedClass = +id;
    state.modal = 'attendance';
  },

  async saveAttendance() {
    const codeBox = document.getElementById('attendanceCode');

    await api('POST', '/attendance', {
      classId: state.selectedClass,
      status: value('attStatus'),
      code: codeBox ? codeBox.value : ''
    });

    state.modal = null;
    toast('Attendance recorded');
  },

  openNewClass() {
    state.modal = 'newClass';
  },

  async saveNewClass() {
    const r = await api('POST', '/classes', {
      code: value('newCode'),
      group: value('newGroup'),
      title: value('newTitle'),
      days: value('newDays'),
      start: value('newStart'),
      end: value('newEnd'),
      room: value('newRoom')
    });

    state.modal = null;
    toast(`Class created. Join code: ${r.joinCode}`);
  },

  openRoster(id) {
    state.selectedClass = +id;
    state.rosterResult = null;
    state.modal = 'roster';
  },

  async saveRoster() {
    state.rosterResult = await api('POST', `/classes/${state.selectedClass}/roster`, { text: value('rosterText') });
  },

  openClassDetail(id) {
    state.selectedClass = +id;
    state.view = 'classDetail';
  },

  openMaterial() {
    state.modal = 'material';
    state.pendingFile = null;
  },

  async saveMaterial() {
    const title = value('matTitle').trim();
    const link = value('matLink').trim();
    const file = state.pendingFile;

    required(title);

    if (!file && !link) {
      throw new Invalid('Add a file or a link.');
    }

    await api('POST', '/materials', {
      classId: state.selectedClass,
      title,
      note: value('matNote').trim(),
      link,
      fileName: file ? file.name : '',
      data: file ? file.data : ''
    });

    state.modal = null;
    state.pendingFile = null;
    toast('Material posted');
  },

  async deleteMaterial(id) {
    if (!confirm('Delete this material?')) return;
    await api('DELETE', `/materials/${id}`, {});
    toast('Material deleted');
  },

  openAddUser() {
    state.modal = 'addUser';
  },

  async saveUser() {
    await api('POST', '/users', {
      name: value('name').trim(),
      email: value('newEmail').trim(),
      role: value('role'),
      password: value('newPassword')
    });

    state.modal = null;
    toast('User added');
  },

  async toggleUser(id) {
    await api('POST', `/users/${id}/toggle`, {});
  },

  async runReminders() {
    const r = await api('POST', '/reminders/run', {});
    toast(`${r.sent} reminder(s) sent`);
  }
};

const LOCAL = ['nav', 'open', 'close', 'openPost', 'openEdit', 'openDelete', 'openAddClass', 'openLoad', 'previewLoad', 'calMonth', 'openAttendance', 'openNewClass', 'openRoster', 'openClassDetail', 'openMaterial', 'openAddUser'];

let running = false;

const run = async (name, id) => {
  if (running) return;
  running = true;
  const wasIn = !!state.user;

  try {
    await actions[name](id);

    if (!LOCAL.includes(name) || name === 'nav') {
      await refresh();
    }
  } catch (e) {
    running = false;

    if (e instanceof Invalid) {
      if (wasIn && !state.user) render();
      return toast(e.message, true);
    }

    throw e;
  }

  running = false;
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
  if (e.target.id === 'matFile') {
    const file = e.target.files[0];
    state.pendingFile = null;
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      return toast('File is too big. Use a file up to 5 MB or add a link instead.', true);
    }

    const reader = new FileReader();
    reader.onload = () => (state.pendingFile = { name: file.name, data: reader.result });
    reader.readAsDataURL(file);
    return;
  }

  if (e.target.id === 'rosterFile') {
    const file = e.target.files[0];
    if (file) file.text().then(text => (document.getElementById('rosterText').value = text));
    return;
  }

  if (e.target.id === 'loadImage') {
    const file = e.target.files[0];
    if (!file) return;

    toast('Reading screenshot...');

    readImage(file)
      .then(text => {
        const rows = parseStudyLoad(text);

        if (!rows.length) {
          document.getElementById('studyLoad').value = text;
          return toast('No subjects found. Fix the text below or paste it instead.', true);
        }

        state.loadRows = rows;
        render();
      })
      .catch(() => toast('Could not read the screenshot. Paste the text instead.', true));
    return;
  }

  if (e.target.id === 'showPw') {
    ['password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.type = e.target.checked ? 'text' : 'password';
    });
    return;
  }

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
  if (e.key === 'Enter' && !state.user && document.activeElement && document.activeElement.id === 'password') {
    run('login');
  }
});

(async () => {
  try {
    config = await api('GET', '/config');
  } catch {}

  await refresh();
  render();
})();
