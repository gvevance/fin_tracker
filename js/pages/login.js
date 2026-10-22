import { signIn, signUp, waitForAuth } from "../auth.js";
import { firebaseConfig, isFirebaseConfigured } from "../firebase-config.js";

const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const errorEl = document.getElementById("auth-error");
const tabs = document.querySelectorAll(".tab");

function getReturnPath() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return");
  if (returnTo && !returnTo.includes("..")) {
    return returnTo;
  }
  return "index.html";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.tab;
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    signinForm.classList.toggle("hidden", name !== "signin");
    signupForm.classList.toggle("hidden", name !== "signup");
    clearError();
  });
});

async function handleAuth(promise) {
  clearError();
  try {
    await promise;
    window.location.replace(getReturnPath());
  } catch (err) {
    showError(err.message || "Authentication failed.");
  }
}

signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(signinForm);
  handleAuth(signIn(data.get("email"), data.get("password")));
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(signupForm);
  handleAuth(signUp(data.get("email"), data.get("password")));
});

if (!isFirebaseConfigured(firebaseConfig)) {
  showError(
    "Firebase is not configured. Copy js/firebase-config.example.js values into js/firebase-config.js from the Firebase Console."
  );
  signinForm.querySelector("button[type=submit]").disabled = true;
  signupForm.querySelector("button[type=submit]").disabled = true;
} else {
  const existing = await waitForAuth();
  if (existing) {
    window.location.replace(getReturnPath());
  }
}
