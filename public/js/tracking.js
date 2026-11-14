import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  requireRole, wireLogout, esc, fmtDate, statusBadge, showMsg, hideMsg, friendlyError
} from "./auth.js";

wireLogout();

const { user, profile, admin } = await requireRole("any");

const $ = (id) => document.getElementById(id);
const input = $("intern-id");
const msg = $("msg");
const results = $("results");

if (admin) {
  // Admins can search any Intern ID. Fix the nav links for admins.
  $("nav").innerHTML = `
    <a href="admin-dashboard.html">Admin Dashboard</a>
    <a class="active" href="track-submission.html">Track</a>
    <button type="button" data-logout>Logout</button>`;
  wireLogout();
} else {
  // Interns can only look at their own ID (the Firestore rules enforce this as well).
  input.value = profile.internId;
  input.readOnly = true;
  $("intro").textContent = "These are your submissions, with their status and any admin feedback.";
}

function link(url) {
  const safe = /^https?:\/\//i.test(url) ? url : "#";
  return `<a class="link-break" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
}

function card(r) {
  return `
    <article class="sub-card">
      <header>
        <div><h3>Task ${esc(r.taskNumber)} — ${esc(r.taskTitle)}</h3><span class="muted">${esc(r.internId)}</span></div>
        ${statusBadge(r.status)}
      </header>
      <p>${esc(r.description)}</p>
      <div class="kv">
        <div><span>Submitted</span>${esc(fmtDate(r.submittedAt))}</div>
        <div><span>Reviewed</span>${esc(fmtDate(r.reviewedAt))}</div>
        <div><span>GitHub</span>${link(r.githubUrl)}</div>
        <div><span>Report</span>${link(r.reportUrl)}</div>
      </div>
      ${r.notes ? `<div class="kv"><div><span>Notes</span>${esc(r.notes)}</div></div>` : ""}
      ${r.adminFeedback
        ? `<div class="feedback"><strong>Admin feedback</strong><br>${esc(r.adminFeedback)}</div>`
        : '<p class="muted" style="margin:0">No admin feedback yet.</p>'}
    </article>`;
}

async function search() {
  hideMsg(msg);
  results.innerHTML = "";
  const id = input.value.trim().toUpperCase();
  if (!/^YSSE-\d{4}-\d{3,6}$/.test(id)) {
    return showMsg(msg, "error", "Enter a valid Intern ID, like YSSE-2026-001.");
  }
  try {
    // Intern: filter by own uid (allowed by rules). Admin: filter by the searched Intern ID.
    const q = admin
      ? query(collection(db, "submissions"), where("internId", "==", id))
      : query(collection(db, "submissions"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.internId === id)
      .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));

    if (!rows.length) {
      return showMsg(msg, "info", `No submissions found for ${id}.`);
    }
    results.innerHTML = rows.map(card).join("");
  } catch (err) {
    showMsg(msg, "error", friendlyError(err));
  }
}

$("search-form").addEventListener("submit", (e) => { e.preventDefault(); search(); });

// Interns see their own submissions straight away.
if (!admin) search();
