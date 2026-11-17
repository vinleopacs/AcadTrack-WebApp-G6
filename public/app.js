
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
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="m6 21 4-6 3 2 1-5 4 3M9 12l3-4 3 1"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'
};

const icon = (name, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

let db = { users: [], classes: [], enrollments: [], invites: [], requests: [], requested: [], assignments: [], submissions: [], notifications: [], attendance: [], materials: [] };

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

const enrolled = c => db.enrollments.some(e => e[0] == state.user.id && e[1] == c.id);

const myClasses = () =>
  state.user.role === 'Teacher'
    ? db.classes.filter(c => c.teacherId == state.user.id)
    : db.classes.filter(c => c.teacherId && enrolled(c));

const scheduleClasses = () => db.classes.filter(c => !c.teacherId && enrolled(c));

const DAYS = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sat: 6 };

const fmtMin = m => `${(Math.floor(m / 60) + 11) % 12 + 1}:${pad(m % 60)} ${m < 720 ? 'AM' : 'PM'}`;

const DAY = '(?:Sat|Su|Th|M|T|W|F)';
const TIME = '(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:([AP])\\.?\\s*M\\.?)?';
const RANGE = new RegExp(`${TIME}\\s*[-–—~]+\\s*${TIME}`, 'i');
const SCHED = new RegExp(`\\b(${DAY}(?:\\s*${DAY})*)\\s*,?\\s*${TIME}\\s*[-–—~]+\\s*${TIME}`, 'g');
const CODE = /(?:(\d{1,3})[^A-Z\d]{0,6})?([A-Z]{2,}(?:-[A-Z]+)?\s+(?:[A-Z]+-)?[A-Z\d]*\d?[A-Z\d]*-?)\s*$/;
const KNOWN = new RegExp(`(?:(\\d{1,3})[^A-Z\\d]{0,6})?(${Object.keys(COURSES).map(c => c.replace(/\s+/g, '\\s*')).join('|')})\\s*$`);
const COURSE_KEYS = Object.keys(COURSES).map(c => [c.replace(/\s+/g, ''), c]);

const dist = (a, b) => {
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1]));
    prev = row;
  }
  return prev[b.length];
};

const matchCourse = code => {
  const k = code.toUpperCase().replace(/\s+/g, '').replace(/(\d)O|O(\d)/g, '$10$2');
  const exact = COURSE_KEYS.find(([c]) => c === k);
  if (exact) return exact[1];
  const near = COURSE_KEYS.filter(([c]) => dist(c, k) === 1);
  return near.length === 1 ? near[0][1] : code.trim();
};

const ROOM = /\b[A-Z]{1,4}\d{1,4}[A-Z]{0,4}\b/;

const fixOcr = text => text
  .replace(/\b([\dOoIl]{1,2})\s*[:.]\s*([\dOoIl]{2})(?=\s*[AaPp]\.?\s*[Mm]|\s*[-–—])/g, (_, h, m) => `${h}:${m}`.replace(/[Oo]/g, '0').replace(/[Il]/g, '1'))
  .replace(/\s+/g, ' ');

const toMins = (h, m, ap) => (h % 12 + (/p/i.test(ap) ? 12 : 0)) * 60 + +(m || 0);

const parseRange = text => {
  const t = String(text).match(RANGE);
  if (!t) return null;
  const endAp = t[6] || (t[4] < 7 || t[4] == 12 ? 'P' : 'A');
  let start = toMins(t[1], t[2], t[3] || endAp);
  const end = toMins(t[4], t[5], endAp);
  if (!t[3] && start > end) start -= 720;
  return start >= 0 && end > start ? { start, end } : null;
};

const toLoadRow = r => ({ group: r.group, code: r.code, dayText: r.dayText, time: `${fmtMin(r.start)} - ${fmtMin(r.end)}`, room: r.room, faculty: r.faculty });

const syncLoad = () => document.querySelectorAll('[data-row]').forEach(el => (state.loadRows[el.dataset.row][el.dataset.key] = el.value));

const parseStudyLoad = raw => {
  const text = fixOcr(raw);
  const found = [...text.matchAll(SCHED)].map(m => {
    const before = text.slice(0, m.index);
    const code = before.match(KNOWN) || before.match(CODE);
    return { m, code, head: code ? m.index - code[0].length + (code[0].length - code[0].trimStart().length) : m.index };
  });

  return found.map(({ m, code }, i) => {
    const range = parseRange(m[0]);
    if (!code || !range) return null;
    let rest = text.slice(m.index + m[0].length, i + 1 < found.length ? found[i + 1].head : text.length).replace(/\bUnits\b.*$/i, '');
    let name = code[2].trim();
    const room = rest.match(ROOM);
    if (room) {
      const before = rest.slice(0, room.index).trim().split(' ');
      if (name.endsWith('-') && /^[A-Z\d]+$/.test(before[before.length - 1] || '')) name += before.pop();
      rest = before.join(' ') + ' ' + rest.slice(room.index + room[0].length).replace(/^\s*TC\b/, '');
    }
    const days = m[1].match(/Sat|Su|Th|M|T|W|F/g);
    return {
      group: code[1] || '',
      code: matchCourse(name),
      dayText: days.join(' '),
      days: days.map(d => DAYS[d]),
      ...range,
      room: room ? room[0] : '',
      faculty: rest.replace(/\d+\.\d+\s*[A-Z]*|\b[a-z]\b/g, ' ').replace(/[^A-Za-zÑñ,.\s-]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,.]+|[\s,]+$/g, '').trim()
    };
  }).filter(Boolean);
};

const toHHMM = m => (m == null ? '' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);

const parseClassList = text => {
  const t = fixOcr(text);
  const code = Object.keys(COURSES).find(c => new RegExp(`(^|[^A-Z\\d])${c.replace(/\s+/g, '\\s*')}(?![A-Z\\d])`, 'i').test(t))
    || (t.match(/\b[A-Z]{2,}(?:-[A-Z]+)?\s?\d{3,4}[A-Z]?\b/) || [''])[0];
  const sched = [...t.matchAll(SCHED)][0];
  const range = sched && parseRange(sched[0]);
  const room = (sched ? t.slice(sched.index + sched[0].length) : t).match(ROOM);
  return {
    code,
    group: (t.match(/group\s*#?\s*(\d+)/i) || [])[1] || '',
    title: (COURSES[code] || '').toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase()),
    days: sched ? sched[1].match(/Sat|Su|Th|M|T|W|F/g).join(' ') : '',
    start: range ? toHHMM(range.start) : '',
    end: range ? toHHMM(range.end) : '',
    room: room ? room[0] : '',
    emails: [...new Set((text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).map(e => e.toLowerCase()))],
    text
  };
};

const nowMin = () => new Date().getHours() * 60 + new Date().getMinutes();

const classForm = () => ({
  code: value('newCode'),
  group: value('newGroup'),
  title: value('newTitle'),
  days: value('newDays'),
  start: value('newStart'),
  end: value('newEnd'),
  room: value('newRoom'),
  color: (document.querySelector('[name=classColor]:checked') || {}).value
});

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
    ['home', 'Home', 'home'],
    ['notifications', 'Notifications', 'bell'],
    ['attendance', 'Attendance', 'check'],
    ['classes', 'Classes', 'book'],
    ['profile', 'Profile', 'user']
  ],
  Teacher: [
    ['home', 'Home', 'home'],
    ['notifications', 'Notifications', 'bell'],
    ['classes', 'Classes', 'book'],
    ['profile', 'Profile', 'user']
  ],
  Admin: [
    ['users', 'Users', 'list'],
    ['profile', 'Profile', 'user']
  ]
};

const googleBlock = () => (config.googleClientId ? '<div class="auth-or"><span>or</span></div><div id="googleBtn" class="google-btn"></div>' : '');

const authBody = () => state.forgot ? `
    <h1 class="auth-title">Forgot password</h1>
    <p class="auth-sub">Students and professors don't have an AcadTrack password. Sign in with your @${esc(config.domain)} Google account instead.</p>
    <p class="auth-sub">Forgot your school Google password? Use "Forgot password?" on the Google sign-in screen or ask the school IT office.</p>
    <p class="auth-sub">Admin: change ADMIN_PASSWORD in the server settings and restart the app. The new password works right away.</p>
    <button class="btn primary block" data-action="hideForgot">Back to sign in</button>` : `
    <h1 class="auth-title">Sign in</h1>
    <p class="auth-sub">Welcome back. Use your school email.</p>
    ${field('email', 'Email', { type: 'email', placeholder: '22100001@' + config.domain })}
    ${field('password', 'Password', { type: 'password', placeholder: '••••••••', max: 255 })}
    <div class="auth-row">
      <label class="remember"><input id="remember" type="checkbox"> Remember me</label>
      <button class="link-btn" data-action="showForgot">Forgot password?</button>
    </div>
    <button class="btn primary block" data-action="login">Sign in</button>
    ${googleBlock()}
    <p class="auth-switch">Students and professors: no password needed, just sign in with your @${esc(config.domain)} Google account.</p>`;

const loginView = () => `
  <div class="login">
    <div class="login-card">
      <div class="login-brand">${logo()}</div>
      ${authBody()}
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

const requestsOf = c => db.requests.filter(r => r[0] == c.id).map(r => user(r[1])).filter(Boolean);

const pendingOf = c => db.invites.filter(i => i[0] == c.id).map(i => i[1]);

const studentsOf = c => db.enrollments.filter(e => e[1] == c.id).map(e => user(e[0])).filter(Boolean);

const TONES = [['#5b4785', '#ece6f7'], ['#1f7a73', '#dcf1ee'], ['#9a6209', '#fdf0dd'], ['#a33a5a', '#fbe6ec'], ['#2f5f9e', '#e2ecf8'], ['#5c7a1f', '#ecf3dc'], ['#b0482a', '#fbe8e1'], ['#3d4f6b', '#e5e9f0']];
const hash = c => [...c.code + c.group].reduce((h, ch) => h * 31 + ch.charCodeAt(0) >>> 0, 7);
const tone = c => TONES[(c.color ?? hash(c)) % TONES.length];
const freeColor = () => [0, 1, 2, 3, 4, 5, 6, 7].find(i => !myClasses().some(c => c.color === i)) ?? 0;
const toneStyle = c => `--tone:${tone(c)[0]};--tone-bg:${tone(c)[1]}`;
const SUBJECT_ICONS = { IT: 'monitor', CIS: 'code', CS: 'code', IS: 'chart', GE: 'globe', TPE: 'run', NSTP: 'flag', EDM: 'heart' };
const subjectIcon = c => SUBJECT_ICONS[c.code.match(/^[A-Z]+/)[0]] || 'book';
const pattern = c => `p${hash(c) % 4}`;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const nextClass = c => {
  if (!c.days || !c.days.length || c.start == null) return '';
  const today = new Date().getDay();
  for (let i = 0; i < 8; i++) {
    const d = (today + i) % 7;
    if (!c.days.includes(d) || (i === 0 && nowMin() >= c.end)) continue;
    if (i === 0) return nowMin() >= c.start ? 'Happening now' : `Today · ${fmtMin(c.start)}`;
    return `${i === 1 ? 'Tomorrow' : DAY_NAMES[d]} · ${fmtMin(c.start)}`;
  }
  return '';
};

const classCard = c => {
  const teacher = state.user.role === 'Teacher';
  const prof = user(c.teacherId);
  const mats = db.materials.filter(m => m.classId == c.id);
  const fresh = mats.filter(m => m.posted >= day(-3)).length;
  const [code, title] = c.name.split(' — ');
  const next = nextClass(c);
  const who = prof ? prof.name : c.faculty || '';

  return `
    <article class="ccard" style="${toneStyle(c)}">
      <button class="ccard-main" data-action="openClassDetail" data-id="${c.id}">
        <span class="ccard-banner ${pattern(c)}">
          <span class="subject" aria-hidden="true">${icon(subjectIcon(c), 26)}</span>
          <span class="tags">${c.group ? `<em>Group ${esc(c.group)}</em>` : ''}${fresh ? `<em class="fresh">${fresh} new</em>` : ''}${teacher && requestsOf(c).length ? `<em class="fresh">${requestsOf(c).length} request${requestsOf(c).length === 1 ? '' : 's'}</em>` : ''}</span>
          <b>${esc(code)}</b>
          ${title ? `<span>${esc(title)}</span>` : ''}
        </span>
        <span class="ccard-body">
          ${who ? `<span class="ccard-prof"><span class="avatar">${esc(initials(who))}</span>${esc(prof ? displayName(prof) : who)}</span>` : ''}
          <span class="ccard-sched">${(c.dayText || '').split(' ').filter(Boolean).map(d => `<i>${esc(d)}</i>`).join('')}${c.start != null ? `<span>${fmtMin(c.start)} – ${fmtMin(c.end)}</span>` : ''}${c.room ? `<span>· ${esc(c.room)}</span>` : ''}</span>
          ${next ? `<span class="ccard-next ${next.startsWith('Today') || next.startsWith('Happening') ? 'today' : ''}">${icon('clock', 16)} ${next}</span>` : ''}
        </span>
      </button>
      <footer class="ccard-foot">
        ${teacher ? `
          <button class="code-chip" data-action="copyCode" data-id="${esc(c.joinCode)}" aria-label="Copy join code ${esc(c.joinCode)}">${esc(c.joinCode)}${icon('copy', 15)}</button>
          <span title="${studentsOf(c).length} students, ${pendingOf(c).length} pending">${icon('user', 16)}${studentsOf(c).length}${pendingOf(c).length ? ` (+${pendingOf(c).length})` : ''}</span>
          <button class="icon-btn" data-action="openRoster" data-id="${c.id}" aria-label="Upload class list" title="Upload class list">${icon('upload', 18)}</button>`
        : `<span>${icon('file', 16)}${mats.length} material${mats.length === 1 ? '' : 's'}</span>`}
      </footer>
    </article>`;
};

const requestCard = c => `
  <article class="ccard waiting" style="${toneStyle(c)}">
    <span class="ccard-banner ${pattern(c)}">
      <span class="subject" aria-hidden="true">${icon(subjectIcon(c), 26)}</span>
      <span class="tags">${c.group ? `<em>Group ${esc(c.group)}</em>` : ''}</span>
      <b>${esc(c.name.split(' — ')[0])}</b>
      ${c.name.split(' — ')[1] ? `<span>${esc(c.name.split(' — ')[1])}</span>` : ''}
    </span>
    <footer class="ccard-foot"><span>${icon('clock', 16)}Waiting for your professor to approve</span></footer>
  </article>`;

const emptyClasses = text => `
  <div class="empty-state">
    <span class="tile">${icon('book', 30)}</span>
    <b>No classes yet</b>
    <p>${text}</p>
  </div>`;

const teacherClassesView = () => `
  <header class="page-head">
    <div>
      <h1>My classes</h1>
      <p class="sub">Create a class, upload your class list, and share the join code.</p>
    </div>
    <button class="btn primary end" data-action="openNewClass">${icon('plus', 18)} New class</button>
  </header>

  ${myClasses().length ? `<div class="ccards">${myClasses().map(classCard).join('')}</div>` : emptyClasses('Click New class and upload your class list to get started.')}`;

const ext = name => (name || '').split('.').pop().toLowerCase();
const fileKind = m => {
  if (!m.hasFile) return 'link';
  const e = ext(m.fileName);
  if (e === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return 'image';
  if (['md', 'txt', 'csv'].includes(e)) return 'text';
  if (['ppt', 'pptx', 'key'].includes(e)) return 'slides';
  if (['doc', 'docx'].includes(e)) return 'doc';
  if (['xls', 'xlsx'].includes(e)) return 'sheet';
  return 'file';
};

const youtubeId = url => (url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/) || [])[1];

const inlineMd = t => esc(t)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

const renderMd = text => {
  const out = [];
  const lines = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (/^\|.*\|\s*$/.test(l)) {
      const rows = [];
      for (; i < lines.length && /^\|.*\|\s*$/.test(lines[i]); i++) if (!/^\|[\s:-|]+\|\s*$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map(c => inlineMd(c.trim())));
      i--;
      out.push(`<table>${rows.map((r, n) => `<tr>${r.map(c => n ? `<td>${c}</td>` : `<th>${c}</th>`).join('')}</tr>`).join('')}</table>`);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const tag = /^\s*\d+\./.test(l) ? 'ol' : 'ul';
      const items = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) items.push(`<li>${inlineMd(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`);
      i--;
      out.push(`<${tag}>${items.join('')}</${tag}>`);
    } else if (/^#{1,6}\s/.test(l)) {
      const n = l.match(/^#+/)[0].length;
      out.push(`<h${n + 1}>${inlineMd(l.replace(/^#+\s*/, ''))}</h${n + 1}>`);
    } else if (/^>\s?/.test(l)) {
      out.push(`<blockquote>${inlineMd(l.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (l.trim()) {
      out.push(`<p>${inlineMd(l)}</p>`);
    }
  }
  return out.join('');
};

const viewerModal = () => {
  const m = db.materials.find(x => x.id == state.viewer);
  if (!m) return '';
  const kind = fileKind(m);
  const src = `/api/materials/${m.id}/file`;
  const yt = m.link && youtubeId(m.link);
  const names = { slides: 'PowerPoint', doc: 'Word', sheet: 'Excel', file: 'This file' };

  const preview = !m.hasFile ? (yt
      ? `<iframe class="viewer-frame video" src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(m.title)}" allowfullscreen></iframe>`
      : `<div class="viewer-empty">${icon('link', 30)}<p>This material is a link.</p></div>`)
    : kind === 'pdf' ? '<div class="viewer-doc viewer-pdf" id="pdfPages"><p class="empty">Loading PDF…</p></div>'
    : kind === 'image' ? `<img class="viewer-img" src="${src}?inline=1" alt="${esc(m.title)}">`
    : kind === 'text' ? `<div class="viewer-doc">${ext(m.fileName) === 'md' ? renderMd(state.viewerText || '') : `<pre>${esc(state.viewerText || '')}</pre>`}</div>`
    : `<div class="viewer-empty"><span class="tile kind-${kind}"><em>${esc(ext(m.fileName).toUpperCase().slice(0, 4))}</em></span><p>${names[kind]} files can’t be previewed in the browser. Download it to open it.</p></div>`;

  return `
  <div class="overlay">
    <div class="modal viewer" role="dialog" aria-label="${esc(m.title)}">
      <div class="modal-head">
        <div>
          <h2>${esc(m.title)}</h2>
          <small>${esc(klass(m.classId).name)} · Posted ${formatDate(m.posted)}</small>
        </div>
        <button class="close" data-action="close" aria-label="Close">${icon('close', 18)}</button>
      </div>
      ${m.note ? `<p class="viewer-note">${esc(m.note)}</p>` : ''}
      ${preview}
      <div class="modal-actions">
        ${safeLink(m.link) ? `<a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener">${icon('link', 18)} Open link</a>` : ''}
        ${m.hasFile ? `<a class="btn primary" href="${src}" download="${esc(m.fileName)}">${icon('download', 18)} Download</a>` : ''}
      </div>
    </div>
  </div>`;
};

const safeLink = url => (/^https?:\/\//i.test(url) ? url : '');

const classDetailView = () => {
  const c = klass(state.selectedClass);
  const teacher = state.user.role === 'Teacher';
  const items = db.materials
    .filter(m => m.classId == c.id)
    .sort((x, y) => y.posted.localeCompare(x.posted));

  return `
    <button class="back" data-action="nav" data-id="classes">${icon('back', 18)} Back to classes</button>

    <section class="class-banner ${pattern(c)}" style="${toneStyle(c)}">
      <span class="subject" aria-hidden="true">${icon(subjectIcon(c), 30)}</span>
      <span class="tags">${c.group ? `<em>Group ${esc(c.group)}</em>` : ''}${teacher ? `<button class="code-chip" data-action="copyCode" data-id="${esc(c.joinCode)}" aria-label="Copy join code ${esc(c.joinCode)}">${esc(c.joinCode)}${icon('copy', 15)}</button>` : ''}</span>
      <h1>${esc(c.name.split(' — ')[0])}</h1>
      ${c.name.split(' — ')[1] ? `<p>${esc(c.name.split(' — ')[1])}</p>` : ''}
      <small>${esc(c.schedule)}${teacher ? ` · ${studentsOf(c).length} student${studentsOf(c).length === 1 ? '' : 's'}${pendingOf(c).length ? ` · ${pendingOf(c).length} pending` : ''}` : user(c.teacherId) ? ` · ${esc(displayName(user(c.teacherId)))}` : ''}</small>
    </section>

    ${teacher ? `<header class="page-head">
      <div class="end">
        <button class="btn" data-action="openEditClass">Edit class</button>
        <button class="btn danger" data-action="deleteClass">Delete class</button>
        <button class="btn" data-action="openRoster" data-id="${c.id}">Upload class list</button>
        <button class="btn primary" data-action="openMaterial">${icon('plus', 18)} Add material</button>
      </div>
    </header>` : ''}

    ${teacher && requestsOf(c).length ? `
      <div class="group-label">Join requests</div>
      <section class="panel">
        ${requestsOf(c).map(u => `
          <div class="user-row">
            <div class="info">${esc(u.name)}<small>${esc(u.email)}</small></div>
            <button class="btn" data-action="declineRequest" data-id="${u.id}">Decline</button>
            <button class="btn primary" data-action="approveRequest" data-id="${u.id}">Approve</button>
          </div>`).join('')}
      </section>` : ''}

    ${teacher ? '' : `
      ${user(c.teacherId) ? `
        <div class="group-label">Professor</div>
        <section class="panel">
          <div class="person prof"><span class="avatar">${esc(initials(user(c.teacherId).name))}</span>${esc(displayName(user(c.teacherId)))}</div>
        </section>` : ''}

      <div class="group-label">Classmates · ${studentsOf(c).length}</div>
      <section class="panel people">
        ${studentsOf(c).sort((x, y) => x.name.localeCompare(y.name)).map(u => `
          <div class="person"><span class="avatar">${esc(initials(u.name))}</span>${esc(u.name)}${u.id == state.user.id ? '<small>You</small>' : ''}</div>`).join('')}
      </section>`}

    ${teacher ? `
      <div class="group-label">Students</div>
      <section class="panel">
        ${studentsOf(c).map(u => `
          <div class="user-row">
            <div class="info">${esc(u.name)}<small>${esc(u.email)}</small></div>
            <button class="btn" data-action="removeStudent" data-id="${u.id}">Remove</button>
          </div>`).join('')}
        ${pendingOf(c).map(e => `
          <div class="user-row">
            <div class="info">${esc(e)}<small>Pending · no account yet</small></div>
            <button class="btn" data-action="removeInvite" data-id="${esc(e)}">Remove</button>
          </div>`).join('')}
        ${studentsOf(c).length || pendingOf(c).length ? '' : '<p class="empty">No students yet. Upload a class list to add them.</p>'}
      </section>` : ''}

    <div class="group-label">Study materials</div>
    <section class="panel">
      ${items.length ? items.map(m => `
        <div class="material">
          <button class="material-open" data-action="openViewer" data-id="${m.id}">
            <span class="tile kind-${fileKind(m)}">${m.hasFile ? `<em>${esc(ext(m.fileName).toUpperCase().slice(0, 4))}</em>` : icon('link')}</span>
            <span class="info">
              <b>${esc(m.title)}</b>
              ${m.note ? `<span>${esc(m.note)}</span>` : ''}
              <small>${m.hasFile ? esc(m.fileName) + ' · ' : ''}Posted ${formatDate(m.posted)}</small>
            </span>
          </button>
          ${teacher ? `<button class="btn" data-action="openEditMaterial" data-id="${m.id}">Edit</button>
          <button class="btn danger" data-action="deleteMaterial" data-id="${m.id}">Delete</button>` : ''}
        </div>`).join('') : `<p class="empty">${teacher ? 'No materials yet. Click Add material to upload one.' : 'Your professor hasn’t posted any materials yet.'}</p>`}
    </section>`;
};

const classesView = () => state.user.role === 'Teacher' ? teacherClassesView() : `
  <header class="page-head">
    <div>
      <h1>My classes</h1>
      <p class="sub">Classes your professors added you to. Got a class code? Use Add class.</p>
    </div>
    <div class="end">
      <button class="btn soft" data-action="openAddClass">${icon('plus', 18)} Add class</button>
    </div>
  </header>

  ${myClasses().length ? `<div class="ccards">${myClasses().map(classCard).join('')}</div>` : db.requested.length ? '' : emptyClasses('Your professor will add you, or enter a class code with Add class to join one.')}
  ${db.requested.length ? `<div class="group-label">Waiting for approval</div><div class="ccards">${db.requested.map(requestCard).join('')}</div>` : ''}`;

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
    const tip = recs.map(a => `${a.className}: ${a.status}`).join('\n');
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
  const today = scheduleClasses().filter(c => !c.days || c.days.includes(new Date().getDay()));
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
      <div class="end">
        <button class="btn soft" data-action="openLoad">${icon('file', 18)} Upload study load</button>
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
      ${scheduleClasses().map(c => {
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
        ${history.map(a => `<tr><td>${formatDate(a.date)}</td><td>${esc(a.className)}</td><td>${attPill(a.status)}</td></tr>`).join('')}
      </table>` : '<p class="empty">No attendance yet.</p>'}
    </section>`;
};

const ring = r => {
  const len = 2 * Math.PI * 42;
  return `
    <svg class="ring ${rateLevel(r)}" viewBox="0 0 100 100" role="img" aria-label="Attendance ${r === null ? 'not started' : r + '%'}">
      <circle cx="50" cy="50" r="42"/>
      <circle class="fill" cx="50" cy="50" r="42" stroke-dasharray="${len * (r || 0) / 100} ${len}"/>
      <text x="50" y="50">${r === null ? '—' : r + '%'}</text>
    </svg>`;
};

const statusToday = c => {
  const signed = signedToday(c);
  const now = nowMin();
  if (signed) return attPill(signed.status);
  if (now >= c.start && now < c.end) return '<span class="att now">Now</span>';
  if (now < c.start) return `<span class="att later">In ${fmtWait(c.start - now)}</span>`;
  return '<span class="att later">Not signed</span>';
};

const firstName = n => (n.includes(',') ? n.split(',')[1] : n).trim().split(' ')[0];

const fmtWait = m => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${m}m`);

const homeView = () => {
  const teacher = state.user.role === 'Teacher';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = (teacher ? myClasses() : scheduleClasses())
    .filter(c => c.days && c.days.includes(new Date().getDay()))
    .sort((x, y) => x.start - y.start);
  const history = db.attendance.filter(a => a.studentId == state.user.id);
  const rate = rateOf(history);
  const notes = db.notifications.filter(n => n.userId == state.user.id).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 4);
  const mats = db.materials.filter(m => myClasses().some(c => c.id == m.classId)).sort((x, y) => y.posted.localeCompare(x.posted)).slice(0, 3);
  const students = new Set(myClasses().flatMap(c => studentsOf(c).map(u => u.id))).size;
  const pendingCount = myClasses().reduce((n, c) => n + pendingOf(c).length, 0);

  const stats = teacher
    ? [['book', myClasses().length, 'Classes'], ['user', students, 'Students'], ['clock', pendingCount, 'Pending'], ['file', db.materials.filter(m => myClasses().some(c => c.id == m.classId)).length, 'Materials']]
    : [['book', myClasses().length, 'Classes'], ['clock', today.length, 'Today'], ['bell', unreadCount(), 'Unread']];

  return `
    <section class="hero">
      <div>
        <small>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</small>
        <h1>${hello}, ${esc(firstName(state.user.name))}</h1>
        <p>${today.length ? `You have ${today.length} class${today.length === 1 ? '' : 'es'} today${today[0] ? `, starting ${fmtMin(today[0].start)}` : ''}.` : 'No classes today. Enjoy the break.'}</p>
      </div>
      ${teacher ? '' : ring(rate)}
    </section>

    <section class="stats cols-${stats.length}">
      ${stats.map(([ic, n, label]) => `<div class="stat"><span class="tile">${icon(ic, 20)}</span><b>${n}</b><span>${label}</span></div>`).join('')}
    </section>

    <div class="home-grid">
      <div>
        <div class="group-label">Today's schedule</div>
        <section class="panel timeline">
          ${today.length ? today.map(c => `
            <div class="slot">
              <span class="time">${fmtMin(c.start)}<small>${fmtMin(c.end)}</small></span>
              <span class="info"><b>${esc(c.name)}</b><small>${esc(c.room || 'No room')}${teacher ? ` · ${studentsOf(c).length} students` : ''}</small></span>
              ${teacher ? `<button class="btn soft" data-action="openClassDetail" data-id="${c.id}">Open</button>` : `<button class="slot-status" data-action="openAttendance" data-id="${c.id}">${statusToday(c)}</button>`}
            </div>`).join('') : `<p class="empty">${teacher ? 'No classes today.' : scheduleClasses().length ? 'No classes today.' : 'Upload your study load on Attendance to see your schedule here.'}</p>`}
        </section>

        ${teacher ? '' : `
          <div class="group-label">Attendance by class</div>
          <section class="panel">
            ${scheduleClasses().map(c => {
              const r = rateOf(history.filter(a => a.classId == c.id));
              return `
                <div class="class-rate">
                  <span class="name">${esc(c.name)}</span>
                  <span class="bar"><i class="${rateLevel(r)}" style="width:${r || 0}%"></i></span>
                  <b class="${rateLevel(r)}">${r === null ? '—' : r + '%'}</b>
                </div>`;
            }).join('') || '<p class="empty">No schedule yet.</p>'}
          </section>`}
      </div>

      <div>
        <div class="group-label">Latest notifications <button class="link-btn" data-action="nav" data-id="notifications">See all</button></div>
        <section class="panel">
          ${notes.length ? notes.map(n => `
            <button class="note ${n.read ? '' : 'unread'}" data-action="readNotification" data-id="${n.id}">
              <span class="tile">${icon(NOTE_ICONS[n.type] || 'bell')}</span>
              <span class="note-text"><b>${esc(n.title)}</b><small>${formatStamp(n.at)}</small></span>
              ${n.read ? '' : '<i class="dot"></i>'}
            </button>`).join('') : '<p class="empty">You’re all caught up.</p>'}
        </section>

        <div class="group-label">${teacher ? 'Recently posted' : 'New materials'}</div>
        <section class="panel">
          ${mats.length ? mats.map(m => `
            <button class="note" data-action="openClassDetail" data-id="${m.classId}">
              <span class="tile">${icon('file')}</span>
              <span class="note-text"><b>${esc(m.title)}</b><small>${esc(klass(m.classId).name)} · ${formatDate(m.posted)}</small></span>
            </button>`).join('') : '<p class="empty">No materials yet.</p>'}
        </section>
      </div>
    </div>`;
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
        ${u.role === 'Admin' ? '' : `<button class="btn" data-action="openSetPassword" data-id="${u.id}">Set password</button>`}
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
  home: homeView,
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

const loadInput = (i, key, label, placeholder) =>
  `<input data-row="${i}" data-key="${key}" value="${esc(state.loadRows[i][key])}" placeholder="${placeholder}" aria-label="${label}"${key === 'code' ? ' list="courseList"' : ''}>`;

const studyLoadModal = () => modal(
  'Upload study load',
  state.loadRows
    ? `${state.loadRows.map((r, i) => `
         <div class="load-row">
           ${loadInput(i, 'group', 'Group', 'Group')}
           ${loadInput(i, 'code', 'Course code', 'Course code')}
           ${loadInput(i, 'dayText', 'Days', 'M W')}
           ${loadInput(i, 'time', 'Time', '12:30 PM - 3:00 PM')}
           ${loadInput(i, 'room', 'Room', 'Room')}
           ${loadInput(i, 'faculty', 'Faculty', 'Faculty')}
           <button class="btn ghost" data-action="removeLoadRow" data-id="${i}">Remove</button>
         </div>`).join('')}
       <datalist id="courseList">${Object.keys(COURSES).map(c => `<option value="${c}">`).join('')}</datalist>
       <button class="btn" data-action="addLoadRow">Add subject</button>
       <p class="modal-hint">Check each subject and fix anything wrong before saving.</p>`
    : `<p class="modal-note">This sets your class schedule for attendance and replaces the one you uploaded before. Your classes and attendance history are kept.</p>
       <label class="field">
         <span>Study load</span>
         <textarea id="studyLoad" placeholder="Paste your study load here"></textarea>
       </label>
       <p class="modal-hint">Open your study load on the school portal, select the whole table, copy it and paste it here. Works from a phone, tablet or computer.</p>
       <div class="auth-or"><span>or</span></div>
       <label class="field">
         <span>Upload a screenshot</span>
         <input id="loadImage" type="file" accept="image/*">
       </label>`,
  CANCEL + (state.loadRows
    ? '<button class="btn primary" data-action="saveLoad">Save classes</button>'
    : '<button class="btn primary" data-action="previewLoad">Preview</button>')
);

const classFields = d => `
  ${field('newCode', 'Course code', { value: d.code, placeholder: 'e.g. IT 3105N', max: 30 })}
  ${field('newGroup', 'Group #', { value: d.group, placeholder: 'e.g. 3', max: 5 })}
  ${field('newTitle', 'Course title (optional)', { value: d.title, placeholder: 'e.g. App Dev and Emerging Tech' })}
  ${field('newDays', 'Days', { value: d.days, placeholder: 'e.g. M W or T Th or Sat', max: 30 })}
  ${field('newStart', 'Start time', { value: d.start, type: 'time' })}
  ${field('newEnd', 'End time', { value: d.end, type: 'time' })}
  ${field('newRoom', 'Room', { value: d.room, placeholder: 'e.g. LB445TC', max: 30 })}
  <fieldset class="swatches">
    <legend>Color</legend>
    ${TONES.map(([fg, bg], i) => `
      <label style="--tone:${fg};--tone-bg:${bg}">
        <input type="radio" name="classColor" value="${i}"${i === (d.color ?? freeColor()) ? ' checked' : ''}>
        <span aria-label="Color ${i + 1}"></span>
      </label>`).join('')}
  </fieldset>`;

const newClassModal = () => {
  const d = state.classDraft;

  if (!d) return modal(
    'New class',
    `<label class="field">
       <span>Class list (.md)</span>
       <input id="classFile" type="file" accept=".md,.txt">
     </label>
     <p class="modal-hint">One file per class. Put the course code, group, schedule and room at the top, then your students' emails. The class is created with the students already in it.</p>
     <div class="missing">IT 3206N · Group 3<br>M W 12:30 PM - 3:00 PM · LB448TC<br>22100001@usc.edu.ph<br>22100002@usc.edu.ph</div>`,
    CANCEL
  );

  return modal(
    'New class',
    `<p class="modal-note">Check the details from your file before creating the class.</p>
     ${classFields(d)}
     <p class="modal-text"><b>${d.emails.length}</b> students found</p>
     ${d.emails.length ? `<div class="missing">${d.emails.map(e => `<div>${esc(e)}</div>`).join('')}</div>` : ''}`,
    CANCEL + '<button class="btn primary" data-action="saveNewClass">Create class</button>'
  );
};

const editClassModal = () => {
  const c = klass(state.selectedClass);
  const [code, title = ''] = c.name.split(' — ');
  return modal(
    'Edit class',
    classFields({ code, group: c.group, title, days: c.dayText, start: toHHMM(c.start), end: toHHMM(c.end), room: c.room, color: c.color }),
    CANCEL + '<button class="btn primary" data-action="updateClass">Save</button>'
  );
};

const rosterModal = () => {
  const c = klass(state.selectedClass);
  const r = state.rosterResult;

  if (r) {
    return modal(
      'Class list uploaded',
      `<p class="modal-text"><b>${r.added}</b> added · <b>${r.already}</b> already in class · <b>${r.missing.length}</b> pending</p>
       ${r.missing.length ? `<p class="modal-hint">These students don't have accounts yet. They'll be added automatically the first time they sign in. You can also give them the join code <b class="join">${esc(c.joinCode || c.code)}</b>:</p>
       <div class="missing">${r.missing.map(m => `<div>${esc(m)}</div>`).join('')}</div>` : ''}`,
      '<button class="btn primary" data-action="close">Done</button>'
    );
  }

  return modal(
    `Upload class list · ${esc(c.name)}`,
    `<label class="field">
       <span>Class list file</span>
       <input id="rosterFile" type="file" accept=".md,.csv,.txt">
     </label>
     <label class="field">
       <span>Or paste the list</span>
       <textarea id="rosterText" placeholder="Name,Email&#10;Juan Dela Cruz,22100001@usc.edu.ph"></textarea>
     </label>
     <p class="modal-hint">Any format works as long as each student has an email. Students with accounts are added right away; the rest stay pending until they sign in.</p>`,
    CANCEL + '<button class="btn primary" data-action="saveRoster">Add students</button>'
  );
};

const materialModal = () => {
  const m = db.materials.find(x => x.id == state.editingMaterial) || {};
  return modal(
    m.id ? 'Edit study material' : 'Add study material',
    `${field('matTitle', 'Title', { value: m.title, placeholder: 'e.g. Chapter 3 slides' })}
     <label class="field">
       <span>Note (optional)</span>
       <textarea id="matNote" maxlength="500" placeholder="What should students do with this?">${esc(m.note || '')}</textarea>
     </label>
     <label class="field">
       <span>${m.hasFile ? `Replace file (now: ${esc(m.fileName)})` : 'File (optional, up to 5 MB)'}</span>
       <input id="matFile" type="file">
     </label>
     ${field('matLink', 'Link (optional)', { value: m.link, placeholder: 'https://…', max: 500 })}
     <p class="modal-hint">Add a file, a link, or both.</p>`,
    CANCEL + `<button class="btn primary" data-action="saveMaterial">${m.id ? 'Save' : 'Post material'}</button>`
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
        `${field('classCode', 'Join code', { placeholder: 'e.g. K7P2QX', max: 50 })}
         <p class="modal-hint">Ask your professor for the class join code. They’ll approve your request before you’re added.</p>`,
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
         ${field('newPassword', 'Password', { type: 'password', placeholder: 'At least 8 characters', max: 72 })}
         <p class="modal-hint">They can sign in with this email and password. Anyone with a school Google account can also use Sign in with Google.</p>`,
        CANCEL + '<button class="btn primary" data-action="saveUser">Save</button>'
      );

    case 'setPassword':
      return modal(
        'Set password',
        `<p class="modal-text">${esc(user(state.selected).name)} · ${esc(user(state.selected).email)}</p>
         ${field('newPassword', 'New password', { type: 'password', placeholder: 'At least 8 characters', max: 72 })}`,
        CANCEL + '<button class="btn primary" data-action="savePassword">Save</button>'
      );

    case 'attendance':
      return attendanceModal();

    case 'studyLoad':
      return studyLoadModal();

    case 'newClass':
      return newClassModal();

    case 'roster':
      return rosterModal();

    case 'editClass':
      return editClassModal();

    case 'material':
      return materialModal();

    case 'viewer':
      return viewerModal();

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

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';

const renderPdf = async id => {
  const box = document.getElementById('pdfPages');
  try {
    if (!window.pdfjsLib) await loadScript(PDFJS + 'pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument(`/api/materials/${id}/file?inline=1`).promise;
    box.innerHTML = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      if (state.viewer != id || !document.getElementById('pdfPages')) return;
      const page = await pdf.getPage(n);
      const width = page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: (box.clientWidth / width) * (window.devicePixelRatio || 1) });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      box.append(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  } catch {
    if (box) box.innerHTML = '<p class="empty">Couldn’t show this PDF here. Use Download to open it.</p>';
  }
};

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
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i + 1] > d[i] + 25 && d[i + 1] > d[i + 2] + 25 ? 255 : (d[i] + d[i + 1] + d[i + 2]) / 3;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(pixels, 0, 0);

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
      state.view = data.user.role === 'Admin' ? 'users' : 'home';
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

  showForgot() {
    state.forgot = true;
  },

  hideForgot() {
    state.forgot = false;
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

  async approveRequest(id) {
    await api('POST', `/classes/${state.selectedClass}/requests/${id}/approve`, {});
    toast('Student added');
  },

  async declineRequest(id) {
    await api('POST', `/classes/${state.selectedClass}/requests/${id}/decline`, {});
    toast('Request declined');
  },

  async openViewer(id) {
    const m = db.materials.find(x => x.id == id);
    state.viewerText = '';
    if (fileKind(m) === 'text') {
      const res = await fetch(`/api/materials/${id}/file?inline=1`);
      state.viewerText = res.ok ? await res.text() : 'Could not load this file.';
    }
    state.viewer = +id;
    state.modal = 'viewer';
    if (fileKind(m) === 'pdf') setTimeout(() => renderPdf(id));
  },

  copyCode(code) {
    navigator.clipboard.writeText(code).then(() => toast(`Join code ${code} copied`), () => toast(code));
  },

  async readNotification(id) {
    const n = db.notifications.find(x => x.id == id);
    if (!n.read) await api('POST', `/notifications/${id}/read`, {});

    const c = n.classId && klass(n.classId);
    if (n.assignmentId && assignment(n.assignmentId)) {
      state.selected = n.assignmentId;
      state.view = 'detail';
    } else if (c && c.teacherId && myClasses().some(x => x.id == c.id)) {
      state.selectedClass = c.id;
      state.view = 'classDetail';
    } else if (c) {
      state.view = 'attendance';
    }
  },

  openAddClass() {
    state.modal = 'addClass';
  },

  async saveClass() {
    const code = value('classCode').trim();
    required(code);
    const res = await api('POST', '/classes/join', { code });
    state.modal = null;
    toast(res.pending ? 'Request sent. You’ll be added once your professor approves it.' : 'Class added');
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

    state.loadRows = rows.map(toLoadRow);
  },

  addLoadRow() {
    syncLoad();
    state.loadRows.push({ group: '', code: '', dayText: '', time: '', room: '', faculty: '' });
  },

  removeLoadRow(i) {
    syncLoad();
    state.loadRows.splice(i, 1);
  },

  async saveLoad() {
    syncLoad();

    const rows = state.loadRows.map(r => {
      const name = r.code.trim() || 'a subject';
      const days = r.dayText.match(/Sat|Su|Th|M|T|W|F/g);
      const range = parseRange(r.time);

      if (!r.code.trim() || !r.group.trim()) throw new Invalid(`Enter the group and course code for ${name}.`);
      if (!days) throw new Invalid(`Days for ${name} must be like M W, T Th or Sat.`);
      if (!range) throw new Invalid(`Time for ${name} must be like 12:30 PM - 3:00 PM.`);

      return { ...r, code: matchCourse(r.code), days: days.map(d => DAYS[d]), dayText: days.join(' '), ...range };
    });

    if (!rows.length) throw new Invalid('Add at least one subject.');

    await api('POST', '/study-load', { rows });

    try {
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
    } catch {}

    toast(`${rows.length} subjects added to your attendance schedule`);
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
    state.classDraft = null;
  },

  async saveNewClass() {
    const d = state.classDraft;
    const r = await api('POST', '/classes', { ...classForm(), text: d ? d.text : '' });

    state.classDraft = null;
    state.selectedClass = r.id;
    state.rosterResult = r;
    state.modal = 'roster';
    toast(`Class created. Join code: ${r.joinCode}`);
  },

  openEditClass() {
    state.modal = 'editClass';
  },

  async updateClass() {
    await api('PUT', `/classes/${state.selectedClass}`, classForm());
    state.modal = null;
    toast('Class updated');
  },

  async deleteClass() {
    if (!confirm('Delete this class? Students and materials in it will be removed.')) return;
    await api('DELETE', `/classes/${state.selectedClass}`, {});
    state.view = 'classes';
    toast('Class deleted');
  },

  async removeStudent(id) {
    if (!confirm('Remove this student from the class?')) return;
    await api('DELETE', `/classes/${state.selectedClass}/students/${id}`, {});
  },

  async removeInvite(email) {
    await api('POST', `/classes/${state.selectedClass}/invites/remove`, { email });
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
    state.editingMaterial = null;
    state.pendingFile = null;
  },

  openEditMaterial(id) {
    state.modal = 'material';
    state.editingMaterial = +id;
    state.pendingFile = null;
  },

  async saveMaterial() {
    const title = value('matTitle').trim();
    const link = value('matLink').trim();
    const file = state.pendingFile;

    const m = db.materials.find(x => x.id == state.editingMaterial);

    required(title);

    if (!file && !link && !(m && m.hasFile)) {
      throw new Invalid('Add a file or a link.');
    }

    await api(m ? 'PUT' : 'POST', m ? `/materials/${m.id}` : '/materials', {
      classId: state.selectedClass,
      title,
      note: value('matNote').trim(),
      link,
      fileName: file ? file.name : '',
      data: file ? file.data : ''
    });

    state.modal = null;
    state.pendingFile = null;
    toast(m ? 'Material updated' : 'Material posted');
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

  openSetPassword(id) {
    state.selected = +id;
    state.modal = 'setPassword';
  },

  async savePassword() {
    await api('POST', `/users/${state.selected}/password`, { password: value('newPassword') });
    state.modal = null;
    toast('Password saved');
  },

  async toggleUser(id) {
    await api('POST', `/users/${id}/toggle`, {});
  },

  async runReminders() {
    const r = await api('POST', '/reminders/run', {});
    toast(`${r.sent} reminder(s) sent`);
  }
};

const LOCAL = ['openViewer', 'copyCode', 'openEditClass', 'openEditMaterial', 'showForgot', 'hideForgot', 'nav', 'open', 'close', 'openPost', 'openEdit', 'openDelete', 'openAddClass', 'openLoad', 'previewLoad', 'addLoadRow', 'removeLoadRow', 'calMonth', 'openAttendance', 'openNewClass', 'openRoster', 'openClassDetail', 'openMaterial', 'openAddUser', 'openSetPassword'];

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
  if (e.target.id === 'classFile') {
    const file = e.target.files[0];
    if (file) file.text().then(text => {
      state.classDraft = parseClassList(text);
      render();
    });
    return;
  }

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

        state.loadRows = rows.map(toLoadRow);
        render();
      })
      .catch(() => toast('Could not read the screenshot. Paste the text instead.', true));
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
  if (e.key === 'Enter' && !state.user && e.target.closest('.login-card input')) {
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
