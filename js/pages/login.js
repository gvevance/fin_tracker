import { signIn, signUp, waitForAuth, signOut } from "../auth.js";
import { firebaseConfig, isFirebaseConfigured } from "../firebase-config.js";

const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const errorEl = document.getElementById("auth-error");
const tabs = document.querySelectorAll(".tab");
const authForms = document.getElementById("auth-forms");
const signedInPanel = document.getElementById("signed-in-panel");
const continueBtn = document.getElementById("continue-btn");
const loginSignOutBtn = document.getElementById("login-sign-out-btn");

function getReturnPath() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return");
  if (returnTo && !returnTo.includes("..")) {
    return returnTo;
  }
  return "index.html";
}

function goToApp() {
  window.location.replace(getReturnPath());
}

function formatAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That username is already taken.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid username or password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Update js/firebase-config.js from Firebase Console → Project settings → Your web app.";
    default:
      return err.message || "Authentication failed.";
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function showSignedInView() {
  authForms?.classList.add("hidden");
  tabs.forEach((tab) => tab.classList.add("hidden"));
  signedInPanel?.classList.remove("hidden");
  document.querySelector(".login-intro")?.classList.add("hidden");
}

function showSignInView() {
  authForms?.classList.remove("hidden");
  tabs.forEach((tab) => tab.classList.remove("hidden"));
  signedInPanel?.classList.add("hidden");
  document.querySelector(".login-intro")?.classList.remove("hidden");
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
    goToApp();
  } catch (err) {
    showError(formatAuthError(err));
  }
}

signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(signinForm);
  handleAuth(signIn(data.get("username"), data.get("password")));
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(signupForm);
  handleAuth(signUp(data.get("username"), data.get("password")));
});

continueBtn?.addEventListener("click", () => {
  goToApp();
});

loginSignOutBtn?.addEventListener("click", async () => {
  clearError();
  try {
    await signOut();
    showSignInView();
  } catch (err) {
    showError(formatAuthError(err));
  }
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
    showSignedInView();
  } else {
    showSignInView();
  }
}
