// Firebase setup. Replace the placeholder values with YOUR project's web app config.
// Firebase Console -> Project settings -> Your apps -> Web app -> "firebaseConfig".
// (This web config is not a secret. Security comes from firestore.rules.)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl9uUriPCG0aI-jY9QyZ2R8ng3oTf7GOY",
  authDomain: "ysse-task-tracking.firebaseapp.com",
  projectId: "ysse-task-tracking",
  storageBucket: "ysse-task-tracking.firebasestorage.app",
  messagingSenderId: "117240767163",
  appId: "1:117240767163:web:19aaae6c1836d38e0aff9e",
  measurementId: "G-CH6V15ZTG9"
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (!isConfigured) {
  window.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.className = "config-warning";
    bar.textContent =
      "Firebase is not configured yet. Open public/js/firebase-config.js and paste your Firebase web app config.";
    document.body.prepend(bar);
  });
}
