import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  registerIntern, loginUser, getProfile, redirectIfSignedIn,
  showMsg, hideMsg, friendlyError
} from "./auth.js";

const msg = document.getElementById("msg");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

redirectIfSignedIn();

function showTab(which) {
  const isLogin = which === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  tabLogin.classList.toggle("active", isLogin);
  tabRegister.classList.toggle("active", !isLogin);
  hideMsg(msg);
}
tabLogin.addEventListener("click", () => showTab("login"));
tabRegister.addEventListener("click", () => showTab("register"));

function busy(form, on) {
  form.querySelector("button[type=submit]").disabled = on;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg(msg);
  const email = document.getElementById("l-email").value.trim();
  const pass = document.getElementById("l-pass").value;
  if (!email || !pass) return showMsg(msg, "error", "Enter your email and password.");

  busy(loginForm, true);
  try {
    const cred = await loginUser(email, pass);
    const profile = await getProfile(cred.user.uid);
    if (!profile || profile.role !== "intern") {
      await signOut(auth);
      showMsg(msg, "error", "This account is not an intern account. Admins should use the Admin Login page.");
      return;
    }
    window.location.href = "intern-dashboard.html";
  } catch (err) {
    showMsg(msg, "error", friendlyError(err));
  } finally {
    busy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg(msg);
  const name = document.getElementById("r-name").value.trim();
  const email = document.getElementById("r-email").value.trim();
  const pass = document.getElementById("r-pass").value;

  if (name.length < 2) return showMsg(msg, "error", "Enter your full name (at least 2 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg(msg, "error", "Enter a valid email address.");
  if (pass.length < 6) return showMsg(msg, "error", "Password must be at least 6 characters.");

  busy(registerForm, true);
  try {
    await registerIntern(name, email, pass);
    window.location.href = "intern-dashboard.html";
  } catch (err) {
    showMsg(msg, "error", friendlyError(err));
  } finally {
    busy(registerForm, false);
  }
});
