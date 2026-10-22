import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "./firebase.js";

/** Internal domain — Firebase Auth still uses email/password under the hood. */
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

export function signUp(username, password) {
  return createUserWithEmailAndPassword(
    auth,
    usernameToAuthEmail(username),
    password
  );
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
  const { lockApp } = await import("./session.js");
  lockApp();
  await firebaseSignOut(auth);
  await waitUntilSignedOut();
  window.location.replace("login.html");
}

export function getCurrentUser() {
  return auth.currentUser;
}

/** After persisted session has been restored (or cleared). */
export async function waitForAuth() {
  await auth.authStateReady();
  return auth.currentUser;
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
