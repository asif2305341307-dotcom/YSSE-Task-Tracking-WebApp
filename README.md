# YSSE Task Submission & Tracking Web App

A responsive web app where interns submit internship tasks and track their review status, and an admin reviews everything from a secure dashboard with live charts.

- **Live App URL:** `https://YOUR_FIREBASE_PROJECT_ID.web.app` *(add after you deploy)*
- **GitHub Repository:** `https://github.com/YOUR_USERNAME/YOUR_REPO` *(add after you push)*

> Status: the code is written and every JavaScript file passes a syntax check. It has **not** been run against a real Firebase project yet, so nothing here claims it is deployed or fully tested. Follow `TESTING.md` after setup.

## Objectives (YSSE Task 05)

1. Responsive web app for task submission and tracking
2. Firebase (Cloud Firestore) for storing data
3. Hosting on Firebase Hosting
4. Intern ID-based search to track submissions
5. Admin dashboard to manage submissions
6. Charts showing submission statistics

## Features

**Interns**
- Register / login with email and password (Firebase Authentication)
- A unique Intern ID is created automatically (`YSSE-2026-001`, `YSSE-2026-002`, ...)
- Dashboard with name, Intern ID, email, and total / pending / approved / rejected counts
- Submit a task: task number and title (chosen from tasks the admin published), description, GitHub link, report link, notes, automatic date and time
- All fields and URLs are validated; success and error messages are shown
- Submission history and tracking page with status, date and admin feedback

**Admin**
- Separate admin login, checked against a protected `admins` collection
- Totals: interns, submissions, pending, approved, rejected
- Search by Intern ID, search by task title, filter by status
- View details, approve, reject, change status, write feedback, delete
- Publish, hide and delete tasks
- Track page lets the admin search any Intern ID
- Pie chart (status), bar chart (submissions per task), line chart (submissions per day), updating live

## Technologies

HTML5, CSS3, JavaScript (ES modules, no build step), Firebase Authentication, Cloud Firestore, Firebase Hosting, Firestore Security Rules, Chart.js 4 (CDN).

## Project structure

```
task-tracking-web-app/
├── public/
│   ├── index.html            home page
│   ├── login.html            intern login + register
│   ├── intern-dashboard.html
│   ├── submit-task.html
│   ├── track-submission.html intern (own data) and admin (any Intern ID)
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── css/style.css
│   └── js/
│       ├── firebase-config.js   <- you paste your Firebase config here
│       ├── auth.js              login, register, role checks, helpers
│       ├── login-page.js, admin-login.js
│       ├── intern-dashboard.js, submit-task.js, tracking.js
│       ├── admin-dashboard.js
│       └── charts.js
├── firestore.rules
├── firebase.json
├── .firebaserc.example
├── TESTING.md
└── README.md
```

## Database structure (Cloud Firestore)

| Collection | Document ID | Fields | Purpose |
|---|---|---|---|
| `users` | the user's `uid` | uid, internId, fullName, email, role (`intern`), createdAt | One profile per intern. Cannot be edited after creation, so role and Intern ID can't be changed. |
| `admins` | the admin's `uid` | (empty or any note) | If a document exists here, that user is an admin. Nobody can write to it from the app. |
| `counters` | `interns` | count | Used to hand out the next Intern ID safely (inside a transaction). |
| `tasks` | `task-<number>` | taskNumber, title, description, deadline, isActive, createdAt | Tasks published by the admin. Interns can only submit to active tasks. |
| `submissions` | auto ID (this is the submissionId) | uid, internId, taskId, taskNumber, taskTitle, description, githubUrl, reportUrl, notes, submittedAt, status, adminFeedback, reviewedAt, reviewedBy | One document per submission. |

Passwords are never stored in Firestore. Firebase Authentication handles them.

## Security

All real protection is in `firestore.rules`, not in the page code:

- Not signed in: no access to anything.
- Interns can read only their own profile and own submissions.
- An intern can create a submission only for themselves, with status `pending`, empty feedback, an active task, a GitHub URL on `github.com`, and a server timestamp. They cannot update or delete submissions, so they can't approve, reject or edit feedback.
- Only admins (a document in `admins/{uid}`) can read all data, change a submission's status, feedback, `reviewedAt` and `reviewedBy` (nothing else), and manage tasks.
- `users` profiles can be created once with role `intern` and never updated, and `admins` can't be written from the app.
- Everything not listed is denied.

Why not custom claims? Setting custom claims needs a server (Cloud Functions needs the paid Blaze plan). The `admins` collection is a simple, protected alternative: it can only be changed in the Firebase Console. No Admin SDK private key is used anywhere in this project.

Known limit: the rules check the Intern ID *format* but cannot prove it was the "next" number, so a malicious signed-in user could in theory pick an unused number. For a student project this is acceptable; a Cloud Function would be the stricter fix.

## Setup (step by step)

### 1. Create the Firebase project
1. Go to https://console.firebase.google.com and click **Add project**. Remember the **Project ID**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode, pick a region near you).
4. **Project settings (gear icon) → Your apps → Web (`</>`)**: register an app (tick Hosting if offered) and copy the `firebaseConfig` values.

### 2. Add your config
Open `public/js/firebase-config.js` and replace every `YOUR_...` value with your own.

### 3. Create `.firebaserc`
Copy `.firebaserc.example` to `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your Project ID.

### 4. Install the Firebase CLI and log in
```bash
npm install -g firebase-tools
firebase login
```
(You need Node.js installed first: https://nodejs.org)

### 5. Deploy the security rules first
```bash
firebase deploy --only firestore:rules
```

### 6. Create your admin account
1. Firebase Console → **Authentication → Users → Add user**. Enter your admin email and a strong password. Copy the **User UID**.
2. **Firestore Database → Start collection** → Collection ID `admins` → Document ID = the UID you copied → add one field, for example `note` (string) = `main admin` → Save.
3. Use this account on the **Admin Login** page.

### 7. Run locally
```bash
firebase emulators:start --only hosting
```
or simply `firebase serve --only hosting`. Open the printed address (usually http://localhost:5000). The app talks to your real Firebase project even when served locally.

### 8. Publish your first task
Log in as admin → **Publish a task** (e.g. Task 5, "Task Submission & Tracking Web App"). Then register an intern account in another browser or private window and test submitting.

### 9. Deploy the app (only when you are ready)
```bash
firebase deploy --only hosting
```
To deploy rules and hosting together: `firebase deploy`.
Your site will be at `https://YOUR_PROJECT_ID.web.app`.

## Screenshots

Add your screenshots here after you run the app:

- Home page
- Intern dashboard
- Submit task form
- Tracking page
- Admin dashboard with charts

## Troubleshooting

- **Yellow bar "Firebase is not configured":** you haven't edited `firebase-config.js`.
- **"Missing or insufficient permissions":** deploy `firestore.rules`, and check the admin UID document exists in `admins`.
- **Login works but admin page bounces you back:** the `admins/<uid>` document is missing or the ID doesn't match the UID.
- **Pages must be served over http(s)**, not opened by double-clicking the file, because the app uses JavaScript modules.
