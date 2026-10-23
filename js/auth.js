import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "./firebase.js";

/** Internal domain — login screen asks for username only. */
const AUTH_EMAIL_DOMAIN = "users.fintracker.local";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(username) {
  return String(username).trim();
}

export function validateUsername(username) {
  const value = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(value)) {
    throw new Error(
      "Username must be 3–24 characters: letters, numbers, and underscore only."
    );
  }
  return value;
}

export function usernameToAuthEmail(username) {
  const value = validateUsername(username);
  return `${value.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

async function ensurePersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    await setPersistence(auth, browserSessionPersistence);
  }
}

export async function signIn(username, password) {
  await ensurePersistence();
  const credential = await signInWithEmailAndPassword(
    auth,
    usernameToAuthEmail(username),
    password
  );
  await credential.user.getIdToken();
  return credential;
}

export function signOut() {
  return firebaseSignOut(auth);
}

/** Login lives at the folder URL (index.html). Avoid `/index.html` — some servers redirect that until the browser errors. */
export function loginHref() {
  return new URL(".", window.location.href).href;
}

export function homeHref() {
  return new URL("home.html", window.location.href).href;
}

export async function signOutToLogin() {
  const goToLogin = () => {
    window.location.replace(loginHref());
  };

  const leaveTimer = setTimeout(goToLogin, 400);

  try {
    await Promise.race([
      firebaseSignOut(auth),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (err) {
    console.error("Sign out failed:", err);
  }

  clearTimeout(leaveTimer);
  goToLogin();
}

export function getCurrentUser() {
  return auth.currentUser;
}

/** Wait for Firebase to restore persisted sign-in (avoids false logouts on navigation). */
export async function waitForAuth() {
  await auth.authStateReady();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const timeoutMs = 8000;
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      }
    });
  });
}

/** Resolves once Firebase reports no signed-in user. */
export function waitUntilSignedOut() {
  return new Promise((resolve) => {
    if (!auth.currentUser) {
      resolve();
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        unsubscribe();
        resolve();
      }
    });
  });
}
