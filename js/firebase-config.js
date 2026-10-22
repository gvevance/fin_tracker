export function isFirebaseConfigured(config) {
  return Boolean(config.apiKey && !String(config.apiKey).startsWith("YOUR_"));
}

export const firebaseConfig = {
  apiKey: "AIzaSyB5WvKCRNT1lrbqaBlsXnhZTQCubDauT2Q",
  authDomain: "fin-tracker-98950.firebaseapp.com",
  projectId: "fin-tracker-98950",
  storageBucket: "fin-tracker-98950.appspot.com",
  messagingSenderId: "312172730990",
  appId: "1:312172730990:web:d3ffd473bd5a2606ab247f",
};
