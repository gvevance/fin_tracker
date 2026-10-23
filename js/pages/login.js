import { signIn, homeHref } from "../auth.js";
import { firebaseConfig, isFirebaseConfigured } from "../firebase-config.js";

const signinForm = document.getElementById("signin-form");
const errorEl = document.getElementById("auth-error");
const submitBtn = signinForm?.querySelector('button[type="submit"]');

function goToApp() {
  window.location.assign(homeHref());
}

function formatAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid username or password.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is disabled in Firebase. Turn on Email/Password under Authentication → Sign-in method.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Update js/firebase-config.js from Firebase Console.";
    default:
      return err.message || "Sign in failed.";
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

signinForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const data = new FormData(signinForm);
  const username = data.get("username");
  const password = data.get("password");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
  }

  try {
    await signIn(username, password);
    goToApp();
  } catch (err) {
    showError(formatAuthError(err));
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  }
});

if (!isFirebaseConfigured(firebaseConfig)) {
  showError(
    "Firebase is not configured. Copy js/firebase-config.example.js into js/firebase-config.js."
  );
  if (submitBtn) submitBtn.disabled = true;
}
