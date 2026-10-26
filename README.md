# AcadTrack: Academic Assignment and Deadline Management System

AcadTrack is a web-based academic assignment and deadline management system designed to help students organize their schoolwork, monitor upcoming deadlines, and track assignment progress. It also allows teachers to manage assignments and administrators to oversee user accounts.

## Overview

Academic tasks and deadlines are often scattered across messaging applications, learning management systems, online classrooms, and personal notes. This can make it difficult for students to stay organized and may result in missed deadlines or late submissions.

AcadTrack aims to provide a centralized platform where assignment information can be organized and accessed more conveniently.

## Features

- **Assignment Management** — View, post, and update assignments.
- **Task Tracking** — Mark assignments as completed and monitor progress.
- **Deadline Reminders** — Help users keep track of upcoming deadlines.
- **Assignment Updates** — Keep users informed about changes to assignment details.
- **User Management** — Manage student and teacher accounts.
- **Role-Based Access** — Provide features according to user roles.

## User Roles

| Role | Description |
|---|---|
| Student | View assignments, track deadlines, mark tasks as completed, and monitor progress. |
| Teacher | Post assignments, provide instructions, set deadlines, and update assignment information. |
| Administrator | Manage user accounts and oversee system information. |

## Technology Stack

The project uses web technologies to provide a browser-based application.

- **HTML** — Application structure
- **CSS** — User interface and styling
- **JavaScript** — Application functionality and interactions
- **Local Storage** — Stores prototype data in the browser

*Note: The storage and technology details should be updated if the project is later connected to a backend server or database.*

## Getting Started

### Prerequisites

- A modern web browser
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)
- [Node.js](https://nodejs.org/) if running the project through its included Node.js server

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/AcadTrack.git
   ```

2. Open the project folder:

   ```bash
   cd AcadTrack
   ```

3. If the project includes a `package.json` with a start script, run:

   ```bash
   npm start
   ```

4. Open the local address shown by the server in your browser. If using the project's default server configuration, this may be:

   ```text
   http://127.0.0.1:3000
   ```

If you are using a version without a Node.js server, open the project's `index.html` file in your browser instead.

## Demo Accounts

If demo login buttons are enabled in your current version, they can populate the login form with the following sample credentials.

| Role | Email | Password |
|---|---|---|
| Student | `student@acadtrack.edu` | `123456` |
| Teacher | `teacher@acadtrack.edu` | `123456` |
| Administrator | `admin@acadtrack.edu` | `123456` |

**Important:** These are demonstration credentials only. Do not use them for a production system.

## Project Structure

The exact structure may vary depending on the version uploaded to this repository. A typical project layout may look like this:

```text
AcadTrack/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── server.js
├── package.json
└── README.md
```

## Current Limitations

- The current prototype may store data locally in the browser.
- Data stored in browser Local Storage is not automatically synchronized across different devices or users.
- A production deployment would require appropriate backend services, persistent database storage, and security controls.
- Demo credentials are intended for testing and demonstration purposes.

## Future Improvements

- Integrate a database for persistent storage.
- Add email or push notifications for upcoming deadlines.
- Improve mobile responsiveness and accessibility.
- Add assignment filtering, sorting, and search.
- Strengthen authentication and role-based permissions.
- Add reporting and more detailed progress tracking.

## Project Purpose

AcadTrack is developed as an academic software project to demonstrate the design and development of an assignment and deadline management system based on user needs and functional requirements.

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
