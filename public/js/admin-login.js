import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loginUser, isAdmin, redirectIfSignedIn, showMsg, hideMsg, friendlyError } from "./auth.js";

const msg = document.getElementById("msg");
const form = document.getElementById("admin-form");

redirectIfSignedIn();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg(msg);
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value;
  if (!email || !pass) return showMsg(msg, "error", "Enter your email and password.");

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const cred = await loginUser(email, pass);
    // Admin status comes from the protected /admins collection (Firestore rules).
    if (!(await isAdmin(cred.user.uid))) {
      await signOut(auth);
      showMsg(msg, "error", "This account is not an administrator.");
      return;
    }
    window.location.href = "admin-dashboard.html";
  } catch (err) {
    showMsg(msg, "error", friendlyError(err));
  } finally {
    btn.disabled = false;
  }
});
