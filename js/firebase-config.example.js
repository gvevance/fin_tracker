/**
 * Copy to firebase-config.js and fill in from Firebase Console:
 * Project settings → Your apps → Web app → firebaseConfig
 *
 * Console setup (one-time):
 * 1. Enable Authentication → Email/Password
 * 2. Create Firestore database
 * 3. Publish rules from ../firebase/firestore.rules
 * 4. Authentication → Settings → Authorized domains → add gvevance.github.io
 */
export function isFirebaseConfigured(config) {
  return Boolean(config.apiKey && !String(config.apiKey).startsWith("YOUR_"));
}

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
