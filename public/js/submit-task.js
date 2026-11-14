import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  requireRole, wireLogout, showMsg, hideMsg, friendlyError, isValidUrl, isValidGithubUrl
} from "./auth.js";

wireLogout();

const { user, profile } = await requireRole("intern");

const $ = (id) => document.getElementById(id);
const msg = $("msg");
const taskSelect = $("task");
let tasks = [];

$("internId").value = profile.internId;
$("submittedAt").value = "Set automatically when you submit";

// Load active tasks so the intern picks a real task (no typing mistakes).
async function loadTasks() {
  try {
    const snap = await getDocs(query(collection(db, "tasks"), where("isActive", "==", true)));
    tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tasks.sort((a, b) => a.taskNumber - b.taskNumber);
    if (!tasks.length) {
      taskSelect.innerHTML = '<option value="">No active tasks yet</option>';
      $("task-hint").textContent = "The admin has not published any tasks yet. Please check back later.";
      $("submit-btn").disabled = true;
      return;
    }
    taskSelect.innerHTML =
      '<option value="">Select a task…</option>' +
      tasks.map((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = `Task ${t.taskNumber} — ${t.title}`;
        return o.outerHTML;
      }).join("");
  } catch (err) {
    showMsg(msg, "error", friendlyError(err));
  }
}

taskSelect.addEventListener("change", () => {
  const t = tasks.find((x) => x.id === taskSelect.value);
  $("taskNumber").value = t ? t.taskNumber : "";
  $("taskTitle").value = t ? t.title : "";
  $("task-hint").textContent = t && t.deadline && typeof t.deadline.toDate === "function"
    ? "Deadline: " + t.deadline.toDate().toLocaleDateString()
    : "";
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg(msg);

  const t = tasks.find((x) => x.id === taskSelect.value);
  const description = $("description").value.trim();
  const githubUrl = $("githubUrl").value.trim();
  const reportUrl = $("reportUrl").value.trim();
  const notes = $("notes").value.trim();

  // ---- validation ----
  if (!t) return showMsg(msg, "error", "Please select a task.");
  if (description.length < 10) return showMsg(msg, "error", "Description must be at least 10 characters.");
  if (!isValidGithubUrl(githubUrl)) return showMsg(msg, "error", "GitHub link must look like https://github.com/user/repo");
  if (!isValidUrl(reportUrl)) return showMsg(msg, "error", "Report link must be a valid http(s) URL.");
  if (notes.length > 1000) return showMsg(msg, "error", "Notes must be 1000 characters or fewer.");

  const btn = $("submit-btn");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "submissions"), {
      uid: user.uid,
      internId: profile.internId,
      taskId: t.id,
      taskNumber: t.taskNumber,
      taskTitle: t.title,
      description,
      githubUrl,
      reportUrl,
      notes,
      submittedAt: serverTimestamp(),
      status: "pending",
      adminFeedback: "",
      reviewedAt: null,
      reviewedBy: ""
    });
    showMsg(msg, "success", "Task submitted successfully! You can follow it on the Track page.");
    $("form").reset();
    $("internId").value = profile.internId;
    $("submittedAt").value = "Set automatically when you submit";
    $("taskNumber").value = "";
    $("taskTitle").value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    showMsg(msg, "error", "Submission failed: " + friendlyError(err));
  } finally {
    btn.disabled = false;
  }
});

loadTasks();
