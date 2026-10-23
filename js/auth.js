import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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

export function signIn(username, password) {
  return signInWithEmailAndPassword(
    auth,
    usernameToAuthEmail(username),
    password
  );
}

export function signOut() {
  return firebaseSignOut(auth);
}

export async function signOutToLogin() {
  await firebaseSignOut(auth);
  await waitUntilSignedOut();
  window.location.replace("index.html");
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
    const timeoutMs = 5000;
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
