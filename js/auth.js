import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

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

/** Username from the signed-in Firebase user (email is username@internal-domain). */
export function usernameFromUser(user) {
  const email = user?.email || "";
  const local = email.split("@")[0];
  if (!local) return "";
  try {
    return validateUsername(local);
  } catch {
    return local.toLowerCase();
  }
}

export function isAdminUser(user) {
  return usernameFromUser(user).toLowerCase() === "admin";
}

export async function rememberUsername(user) {
  const username = usernameFromUser(user);
  if (!user?.uid || !username) return;
  await setDoc(doc(db, "userProfiles", user.uid), { username }, { merge: true });
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
  await rememberUsername(credential.user).catch((err) => {
    console.error("Could not store username:", err);
  });
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
  return appPageHref("home.html");
}

/** Keep query strings on both pretty `/add-expense` and `/add-expense.html` URLs. */
export function appPageHref(fileName, params = {}) {
  const pretty = !/\.html$/i.test(window.location.pathname);
  const path = pretty ? String(fileName).replace(/\.html$/i, "") : fileName;
  const url = new URL(path, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.href;
}

const EDIT_EXPENSE_KEY = "ft.editExpenseId";

export function rememberEditExpense(expenseId) {
  const id = String(expenseId || "").trim();
  if (!id) return;
  try {
    sessionStorage.setItem(EDIT_EXPENSE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function takeEditExpenseId() {
  const fromQuery = new URLSearchParams(window.location.search).get("edit") || "";
  let fromStore = "";
  try {
    fromStore = sessionStorage.getItem(EDIT_EXPENSE_KEY) || "";
    sessionStorage.removeItem(EDIT_EXPENSE_KEY);
  } catch {
    fromStore = "";
  }
  return String(fromQuery || fromStore).trim();
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
