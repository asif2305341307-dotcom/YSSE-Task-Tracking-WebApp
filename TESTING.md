# Testing Report & Checklist

## What has actually been verified

| Check | Result |
|---|---|
| Every JavaScript file parses as a valid ES module (`node --check`) | Passed |
| All `src` / `href` file references in every HTML page exist | Passed |
| `firebase.json` and `.firebaserc.example` are valid JSON | Passed |

## What has NOT been verified yet

These need a real Firebase project, which was not available here. Nothing below was run, so treat it as untested until you tick it off:

- Authentication, Firestore reads/writes, Firebase connection
- Security rules behaviour (not run in the emulator or the Rules Playground)
- Charts, statistics and real-time updates with live data
- Responsive layout in a browser
- Deployment

## Manual test checklist (do these after setup)

Tick each box. If something fails, copy the message you see and ask for help.

### Authentication
- [ ] Register a new intern: you land on the dashboard and see an Intern ID like `YSSE-2026-001`
- [ ] Register a second intern: the ID is `YSSE-2026-002`
- [ ] Logout, then login again with the same email and password
- [ ] Wrong password shows a clear error
- [ ] Opening `intern-dashboard.html` while logged out sends you to the login page
- [ ] The admin account on the **Intern Login** page is refused

### Task submission and storage
- [ ] Admin publishes Task 1 (the task now appears in the intern's dropdown)
- [ ] Submit with an empty description: blocked with a message
- [ ] Submit with `https://gitlab.com/x` as GitHub link: blocked
- [ ] Submit with `not a url` as report link: blocked
- [ ] A valid submission shows a success message
- [ ] In the Firebase Console, `submissions` has the new document with `status: pending`

### Intern ID tracking
- [ ] The Track page shows only the logged-in intern's submissions, with date, status and feedback
- [ ] The Intern ID box is locked for an intern
- [ ] Admin can search `YSSE-2026-001` and `YSSE-2026-002` on the Track page

### Admin authorization and management
- [ ] Admin login works; a normal intern cannot open `admin-dashboard.html` (bounced to admin login)
- [ ] Search by Intern ID, search by task title, and the status filter all narrow the table
- [ ] Approve a submission: status and counters change; intern's dashboard updates to Approved
- [ ] Reject another, with feedback text: the intern sees the feedback
- [ ] Change a status back to Pending with the dropdown and Save changes

### Dashboard statistics and charts
- [ ] Total interns, total, pending, approved, rejected numbers are correct
- [ ] Pie, bar and line charts appear and change when you approve or reject (no page refresh)
- [ ] Charts show "No data yet" on an empty database

### Security rules (Firebase Console → Firestore → Rules → Rules Playground, or the emulator)
- [ ] Unauthenticated `get` on `submissions/anything` is denied
- [ ] Intern A cannot read a submission whose `uid` is Intern B
- [ ] Intern cannot `update` their own submission (e.g. set `status: approved`)
- [ ] Intern cannot `create` a submission with `status: approved`
- [ ] Intern cannot create `admins/<their uid>`
- [ ] Intern cannot `update` `users/<their uid>` to change `role`
- [ ] Admin can update only status, adminFeedback, reviewedAt, reviewedBy

### Responsive design
- [ ] In browser dev tools (F12 → device toolbar), check 375px (phone), 768px (tablet), 1280px (desktop): no sideways scrolling of the page, tables scroll inside their box, buttons are tappable

## Known limits
- Intern ID uniqueness depends on a Firestore transaction; the rules check only the ID format (see README → Security).
- Deleting a task does not delete its existing submissions.
- A browser refresh is needed to see a newly published task in the intern's dropdown.
