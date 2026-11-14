import { db } from "./firebase-config.js";
import {
  collection, doc, onSnapshot, updateDoc, deleteDoc, setDoc, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { requireRole, wireLogout, esc, fmtDate, statusBadge, showMsg, hideMsg, friendlyError } from "./auth.js";
import { renderCharts } from "./charts.js";

wireLogout();

// Only users listed in /admins/{uid} get past this line. The Firestore rules enforce the
// same thing on the server, so even if someone edits this JavaScript they get no data.
const { user, profile } = await requireRole("admin");

const $ = (id) => document.getElementById(id);
const msg = $("msg");
$("who").textContent = "Signed in as " + user.email;

let submissions = [];
let tasks = [];
let current = null; // submission open in the modal

const onError = (err) => showMsg(msg, "error", friendlyError(err));

/* ---------- live data ---------- */

onSnapshot(collection(db, "users"), (snap) => {
  $("s-interns").textContent = snap.docs.filter((d) => d.data().role === "intern").length;
}, onError);

onSnapshot(collection(db, "submissions"), (snap) => {
  submissions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  submissions.sort((a, b) => (b.submittedAt?.toMillis?.() ?? Date.now()) - (a.submittedAt?.toMillis?.() ?? Date.now()));
  updateStats();
  renderTable();
  renderCharts(submissions);
  if (current) { // keep an open modal in sync / close it if the doc was deleted
    const fresh = submissions.find((s) => s.id === current.id);
    if (!fresh) closeModal();
  }
}, onError);

onSnapshot(collection(db, "tasks"), (snap) => {
  tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.taskNumber - b.taskNumber);
  renderTasks();
}, onError);

/* ---------- stats + table ---------- */

function updateStats() {
  const c = (s) => submissions.filter((r) => r.status === s).length;
  $("s-total").textContent = submissions.length;
  $("s-pending").textContent = c("pending");
  $("s-approved").textContent = c("approved");
  $("s-rejected").textContent = c("rejected");
}

function filtered() {
  const id = $("f-intern").value.trim().toUpperCase();
  const title = $("f-title").value.trim().toLowerCase();
  const status = $("f-status").value;
  return submissions.filter((r) =>
    (!id || String(r.internId).toUpperCase().includes(id)) &&
    (!title || String(r.taskTitle).toLowerCase().includes(title)) &&
    (!status || r.status === status));
}

function renderTable() {
  const rows = filtered();
  $("rows").innerHTML = rows.length
    ? rows.map((r) => `
      <tr>
        <td>${esc(r.internId)}</td>
        <td><strong>Task ${esc(r.taskNumber)}</strong><br>${esc(r.taskTitle)}</td>
        <td>${esc(fmtDate(r.submittedAt))}</td>
        <td>${statusBadge(r.status)}</td>
        <td><button class="btn btn-ghost btn-sm" data-open="${esc(r.id)}">View</button></td>
      </tr>`).join("")
    : '<tr><td colspan="5" class="empty">No submissions match.</td></tr>';
}

["f-intern", "f-title"].forEach((id) => $(id).addEventListener("input", renderTable));
$("f-status").addEventListener("change", renderTable);

$("rows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (btn) openModal(btn.dataset.open);
});

/* ---------- modal ---------- */

function link(url) {
  const safe = /^https?:\/\//i.test(url) ? url : "#";
  return `<a class="link-break" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
}

function openModal(id) {
  current = submissions.find((s) => s.id === id);
  if (!current) return;
  hideMsg($("m-msg"));
  $("m-title").textContent = `${current.internId} · Task ${current.taskNumber}`;
  $("m-body").innerHTML = `
    <h3>${esc(current.taskTitle)}</h3>
    <p>${esc(current.description)}</p>
    <div class="kv">
      <div><span>Submitted</span>${esc(fmtDate(current.submittedAt))}</div>
      <div><span>Last reviewed</span>${esc(fmtDate(current.reviewedAt))}</div>
      <div><span>GitHub</span>${link(current.githubUrl)}</div>
      <div><span>Report</span>${link(current.reportUrl)}</div>
    </div>
    ${current.notes ? `<div class="kv"><div><span>Intern notes</span>${esc(current.notes)}</div></div>` : ""}`;
  $("m-status").value = current.status;
  $("m-feedback").value = current.adminFeedback || "";
  $("modal").hidden = false;
}

function closeModal() {
  $("modal").hidden = true;
  current = null;
}

async function saveReview(status) {
  if (!current) return;
  const m = $("m-msg");
  const feedback = $("m-feedback").value.trim();
  if (feedback.length > 1000) return showMsg(m, "error", "Feedback must be 1000 characters or fewer.");
  try {
    await updateDoc(doc(db, "submissions", current.id), {
      status,
      adminFeedback: feedback,
      reviewedAt: serverTimestamp(),
      reviewedBy: user.uid
    });
    $("m-status").value = status;
    showMsg(m, "success", `Saved. Status is now "${status}".`);
  } catch (err) {
    showMsg(m, "error", friendlyError(err));
  }
}

$("m-approve").addEventListener("click", () => saveReview("approved"));
$("m-reject").addEventListener("click", () => saveReview("rejected"));
$("m-save").addEventListener("click", () => saveReview($("m-status").value));
$("m-close").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) closeModal(); });

$("m-delete").addEventListener("click", async () => {
  if (!current) return;
  if (!confirm("Delete this submission permanently? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "submissions", current.id));
    closeModal();
    showMsg(msg, "success", "Submission deleted.");
  } catch (err) {
    showMsg($("m-msg"), "error", friendlyError(err));
  }
});

/* ---------- task management ---------- */

function renderTasks() {
  const box = $("task-list");
  if (!tasks.length) { box.innerHTML = '<p class="muted">No tasks yet. Publish the first one.</p>'; return; }
  box.innerHTML = tasks.map((t) => `
    <div class="task-row">
      <div><strong>Task ${esc(t.taskNumber)}</strong> — ${esc(t.title)}<br>
        <span class="muted">${t.isActive ? "Active" : "Hidden"}${t.deadline?.toDate ? " · due " + esc(t.deadline.toDate().toLocaleDateString()) : ""}</span></div>
      <div style="display:flex; gap:.4rem">
        <button class="btn btn-ghost btn-sm" data-toggle="${esc(t.id)}">${t.isActive ? "Hide" : "Activate"}</button>
        <button class="btn btn-danger btn-sm" data-del="${esc(t.id)}">Delete</button>
      </div>
    </div>`).join("");
}

$("task-list").addEventListener("click", async (e) => {
  const tog = e.target.closest("[data-toggle]");
  const del = e.target.closest("[data-del]");
  try {
    if (tog) {
      const t = tasks.find((x) => x.id === tog.dataset.toggle);
      await updateDoc(doc(db, "tasks", t.id), { isActive: !t.isActive });
    } else if (del) {
      if (!confirm("Delete this task? Existing submissions stay in the database.")) return;
      await deleteDoc(doc(db, "tasks", del.dataset.del));
    }
  } catch (err) {
    onError(err);
  }
});

$("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg(msg);
  const number = parseInt($("t-number").value, 10);
  const title = $("t-title").value.trim();
  const description = $("t-desc").value.trim();
  const deadlineStr = $("t-deadline").value;

  if (!Number.isInteger(number) || number < 1) return showMsg(msg, "error", "Task number must be a positive whole number.");
  if (!title) return showMsg(msg, "error", "Task title is required.");

  try {
    await setDoc(doc(db, "tasks", "task-" + number), {
      taskNumber: number,
      title,
      description,
      deadline: deadlineStr ? Timestamp.fromDate(new Date(deadlineStr + "T23:59:00")) : null,
      isActive: true,
      createdAt: serverTimestamp()
    }, { merge: true });
    $("task-form").reset();
    showMsg(msg, "success", `Task ${number} saved and visible to interns.`);
  } catch (err) {
    onError(err);
  }
});
