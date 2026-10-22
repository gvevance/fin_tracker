import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulators =
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
  new URLSearchParams(location.search).get("emulators") === "1";

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
