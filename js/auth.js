import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "./firebase.js";

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  return firebaseSignOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

/** Resolves when Firebase has checked persisted auth state. */
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
