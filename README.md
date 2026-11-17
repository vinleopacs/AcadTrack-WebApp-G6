# AcadTrack: Academic Assignment and Deadline Management System

AcadTrack is a web app-based system for students, professors and administrators to manage announcements, deadlines, class materials and attendance in one place.

## Features

- **Sign in with Google** using school (`@usc.edu.ph`) accounts; admin uses email + password
- **Home**: a dashboard with today's schedule, attendance rate, latest notifications and new materials; professors see their classes, students, pending invites and recent posts
- **Classes**: professors create a class by uploading a Markdown class list (course code, group, schedule, room and student emails), then edit or delete it, and add or remove students; students without an account yet stay pending and are added on their first sign-in. Students can also join with the join code
- **Attendance**: students upload their study load (text or screenshot) to set their class schedule, then sign Present, Absent, Excused or No Class from the start of class until 11:59 PM that day, with a 15-minute reminder before class and an attendance tracker
- **Study materials**: professors add, edit and delete files or links per class
- **Notifications** for new assignments, updates, deadlines, materials and upcoming classes

## Planned

- **Announcements**: professors post announcements to their classes
- **Email invites**: students on a professor's class list who don't have an AcadTrack account yet get an email with the class and join code; after signing in with Google they accept the class without typing the code

## Technology Stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express |
| Database | PostgreSQL (`pg`) |
| Login | Google Identity Services, `google-auth-library`, `express-session` + `connect-pg-simple`, `bcryptjs` |
| Frontend | HTML, CSS, JavaScript (`public/`) |
| Screenshot reading | Tesseract.js (in the browser) |

## Project Structure

```text
acadtrack/
├── server.js              application entry point
├── config/setup.js        creates tables, first admin, demo class
├── db/schema.sql          database tables
├── routes/api.js          API routes
├── controllers/           route and business logic
├── models/                data access layer (all SQL)
├── middleware/auth.js     login and role checks
├── utils/                 time, errors, reminders
├── public/                frontend (index.html, app.js, styles.css)
├── .env.example           settings template
└── package.json
```

## Running Locally

1. Install [Node.js](https://nodejs.org/) 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in the values (see below).
4. Run `npm start` and open `http://localhost:3000`.

The tables are created automatically on the first start.

## Settings (`.env`)

| Setting | What it is |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon) |
| `SESSION_SECRET` | Any long random text; keeps logins secure |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud |
| `ALLOWED_DOMAIN` | School email domain allowed to sign in (default `usc.edu.ph`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account, created on first start; change `ADMIN_PASSWORD` and restart to reset it |
| `DEMO_MODE` | `true` adds DEMO 101 for testing attendance |
| `NODE_ENV` | `production` on the live server |

## Accounts

- **Admin** logs in with email + password and manages users.
- **Professors** must be added by the admin (Users → Add user → Teacher) with a password. They can sign in with that email and password, or with Google.
- **Students** can be added by the admin the same way, or just sign in with Google; any `@usc.edu.ph` account becomes a Student on first sign-in.
- The admin can set a new password for any professor or student with **Set password** on the Users page.

## Contributors


**AcadTrack Development Team**

| Role | Team Member |
|---|---|
| Project Leader | Nicezel Jamero |
| Assistant Project Leader | Joseff Paclibar |
| Recorder | Jeil Ian Ouano |
| Librarian | Jeric Tan |
| Configuration Manager | Jeric Tan |
| Business Analyst | Jeil Ian Ouano |
| Designer | David Anthony Yap |
| Developer | Joseff Paclibar |
| Tester | David Anthony Yap |

---

*AcadTrack — Stay organized. Track your tasks. Meet your deadlines.*
