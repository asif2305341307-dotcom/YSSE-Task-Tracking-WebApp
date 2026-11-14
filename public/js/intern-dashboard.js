import { db } from "./firebase-config.js";
import {
  collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { requireRole, wireLogout, esc, fmtDate, statusBadge, showMsg, friendlyError } from "./auth.js";

wireLogout();

const { user, profile } = await requireRole("intern");

document.getElementById("p-name").textContent = profile.fullName;
document.getElementById("p-id").textContent = profile.internId;
document.getElementById("p-email").textContent = profile.email;

const tbody = document.getElementById("history");
const msg = document.getElementById("msg");

// Interns can only query their own submissions (the Firestore rules enforce this).
const q = query(collection(db, "submissions"), where("uid", "==", user.uid));

onSnapshot(q, (snap) => {
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // newest first (a just-created doc may briefly have no server time yet)
  rows.sort((a, b) => (b.submittedAt?.toMillis?.() ?? Date.now()) - (a.submittedAt?.toMillis?.() ?? Date.now()));

  const count = (s) => rows.filter((r) => r.status === s).length;
  document.getElementById("s-total").textContent = rows.length;
  document.getElementById("s-pending").textContent = count("pending");
  document.getElementById("s-approved").textContent = count("approved");
  document.getElementById("s-rejected").textContent = count("rejected");

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No submissions yet. Submit your first task!</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td><strong>Task ${esc(r.taskNumber)}</strong><br>${esc(r.taskTitle)}</td>
      <td>${esc(fmtDate(r.submittedAt))}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.adminFeedback ? esc(r.adminFeedback) : '<span class="muted">—</span>'}</td>
    </tr>`).join("");
}, (err) => {
  showMsg(msg, "error", friendlyError(err));
});
