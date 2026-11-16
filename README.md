# AcadTrack: Academic Assignment and Deadline Management System

AcadTrack is a web app-based system for students, professors and administrators to manage announcements, deadlines, class materials and attendance in one place.

## Features

- **Sign up and sign in** with a school (`@usc.edu.ph`) email and password, verified by a 6-digit email code, or with Google; forgot password resets by email code
- **Assignments**: professors post, update and delete; students track and mark them completed. There is no grading: professors don't score, grade or review student work
- **Classes**: professors create classes with a join code and upload a class list per class (Markdown, CSV or TXT); students join with the code or by uploading their study load (text or screenshot)
- **Attendance**: students sign Present, Absent, Excused or No Class from the start of class until 11:59 PM that day, with a 15-minute reminder before class and an attendance tracker
- **Study materials**: professors upload files or links per class
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
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) for sending verification codes; if empty, codes are printed in the server log |
| `MAIL_FROM` | Sender shown on emails, from a domain verified in Resend |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, created on first start |
| `DEMO_MODE` | `true` adds DEMO 101 for testing attendance |
| `NODE_ENV` | `production` on the live server |

## Accounts

- **Admin** signs in with email + password and manages users.
- **Professors** must be added by the admin (Users → Add user → Teacher) before they sign up or sign in with Google.
- **Students** sign up with their `@usc.edu.ph` email or sign in with Google; any new school account becomes a Student.

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
