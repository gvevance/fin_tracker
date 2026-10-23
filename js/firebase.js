import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

let auth;
try {
  // localStorage first: IndexedDB persistence often fails to restore on Android Chrome/PWA.
  auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence],
  });
} catch (err) {
  if (err.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw err;
  }
}

export { auth };
export const db = getFirestore(app);

const useEmulators =
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
  new URLSearchParams(location.search).get("emulators") === "1";

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
