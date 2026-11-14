// Shared helpers: registration, login, logout, role checks, small UI utilities.

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const INTERN_ID_PREFIX = "YSSE-2026-";

/* ---------- small UI helpers ---------- */

// Escape text before putting it into innerHTML (stops HTML injection).
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function showMsg(el, type, text) {
  if (!el) return;
  el.className = "msg " + type; // "success" | "error" | "info"
  el.textContent = text;
  el.hidden = false;
}

export function hideMsg(el) {
  if (el) el.hidden = true;
}

export function fmtDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "—";
  return ts.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function statusBadge(status) {
  const s = ["pending", "approved", "rejected"].includes(status) ? status : "pending";
  return `<span class="badge ${s}">${s}</span>`;
}

export function friendlyError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That email address is not valid.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
    "auth/network-request-failed": "Network problem. Check your internet connection.",
    "permission-denied": "You do not have permission to do that.",
    "unavailable": "Firebase is temporarily unreachable. Try again."
  };
  return map[code] || (err && err.message) || "Something went wrong.";
}

/* ---------- auth actions ---------- */

// Creates the login account, then (in one transaction) gives the intern the next
// Intern ID and saves the profile. Passwords are handled only by Firebase Auth.
export async function registerIntern(fullName, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  try {
    await runTransaction(db, async (tx) => {
      const counterRef = doc(db, "counters", "interns");
      const snap = await tx.get(counterRef);
      const next = snap.exists() ? snap.data().count + 1 : 1;
      const internId = INTERN_ID_PREFIX + String(next).padStart(3, "0");
      tx.set(counterRef, { count: next });
      tx.set(doc(db, "users", uid), {
        uid,
        internId,
        fullName,
        email,
        role: "intern",
        createdAt: serverTimestamp()
      });
    });
  } catch (err) {
    await signOut(auth); // do not leave a half-created account signed in
    throw err;
  }
  return cred.user;
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth).then(() => { window.location.href = "index.html"; });
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// Admin = a document exists at /admins/{uid}. Only the Firebase Console can create it.
// The Firestore rules enforce this too, so this is a convenience check, not the security.
export async function isAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch (e) {
    return false;
  }
}

function authReady() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user); });
  });
}

// Use at the top of a protected page.
// role: "intern" | "admin" | "any" (any = intern or admin)
// Returns { user, profile, admin } or redirects away and never resolves.
export async function requireRole(role) {
  const user = await authReady();
  const loginPage = role === "admin" ? "admin-login.html" : "login.html";
  if (!user) { window.location.replace(loginPage); return new Promise(() => {}); }

  const admin = await isAdmin(user.uid);
  const profile = await getProfile(user.uid);
  const isIntern = !!profile && profile.role === "intern";

  const allowed =
    (role === "admin" && admin) ||
    (role === "intern" && isIntern) ||
    (role === "any" && (admin || isIntern));

  if (!allowed) {
    await signOut(auth);
    window.location.replace(loginPage);
    return new Promise(() => {});
  }
  return { user, profile, admin };
}

// Redirect already-signed-in users away from the login pages.
export async function redirectIfSignedIn() {
  const user = await authReady();
  if (!user) return;
  if (await isAdmin(user.uid)) { window.location.replace("admin-dashboard.html"); return; }
  const profile = await getProfile(user.uid);
  if (profile && profile.role === "intern") window.location.replace("intern-dashboard.html");
}

// Make every [data-logout] button work.
export function wireLogout() {
  document.querySelectorAll("[data-logout]").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); logout(); })
  );
}

// URL checks (the Firestore rules check these again on the server side).
export function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch (e) {
    return false;
  }
}

export function isValidGithubUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "github.com" && u.pathname.length > 1;
  } catch (e) {
    return false;
  }
}
