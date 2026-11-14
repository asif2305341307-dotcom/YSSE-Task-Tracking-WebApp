// Chart.js helpers. Chart.js is loaded as a global "Chart" by admin-dashboard.html.
// Each chart is created once, then updated whenever Firestore data changes.

const charts = {};
const GREEN = "#22c55e", AMBER = "#f5b942", RED = "#ef5350";

function setEmpty(id, isEmpty) {
  const el = document.getElementById(id + "-empty");
  if (el) el.hidden = !isEmpty;
}

function upsert(id, config) {
  if (charts[id]) {
    charts[id].data = config.data;
    charts[id].update();
  } else {
    charts[id] = new Chart(document.getElementById(id), config);
  }
}

const textColor = "#8fa39a";
const gridColor = "#25332c";
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: textColor } } }
};
const axes = {
  x: { ticks: { color: textColor }, grid: { color: gridColor } },
  y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } }
};

export function renderCharts(submissions) {
  // ---- Pie: status distribution ----
  const count = (s) => submissions.filter((r) => r.status === s).length;
  const statusData = [count("pending"), count("approved"), count("rejected")];
  setEmpty("chart-status", submissions.length === 0);
  upsert("chart-status", {
    type: "pie",
    data: {
      labels: ["Pending", "Approved", "Rejected"],
      datasets: [{ data: statusData, backgroundColor: [AMBER, GREEN, RED], borderColor: "#0b0f0d", borderWidth: 2 }]
    },
    options: baseOptions
  });

  // ---- Bar: submissions per task ----
  const perTask = new Map();
  submissions.forEach((r) => {
    const key = `Task ${r.taskNumber}`;
    perTask.set(key, (perTask.get(key) || 0) + 1);
  });
  const taskLabels = [...perTask.keys()].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
  setEmpty("chart-tasks", submissions.length === 0);
  upsert("chart-tasks", {
    type: "bar",
    data: {
      labels: taskLabels,
      datasets: [{ label: "Submissions", data: taskLabels.map((k) => perTask.get(k)), backgroundColor: GREEN, borderRadius: 6 }]
    },
    options: { ...baseOptions, scales: axes }
  });

  // ---- Line: submissions per day ----
  const perDay = new Map();
  submissions.forEach((r) => {
    if (!r.submittedAt || typeof r.submittedAt.toDate !== "function") return;
    const d = r.submittedAt.toDate();
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    perDay.set(key, (perDay.get(key) || 0) + 1);
  });
  const days = [...perDay.keys()].sort();
  setEmpty("chart-trend", days.length === 0);
  upsert("chart-trend", {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        label: "Submissions per day",
        data: days.map((k) => perDay.get(k)),
        borderColor: GREEN, backgroundColor: "rgba(34,197,94,.15)",
        fill: true, tension: 0.3, pointRadius: 4
      }]
    },
    options: { ...baseOptions, scales: axes }
  });
}
