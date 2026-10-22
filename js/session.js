const APP_UNLOCKED_KEY = "fintrack_app_unlocked";

export function unlockApp() {
  sessionStorage.setItem(APP_UNLOCKED_KEY, "1");
}

export function lockApp() {
  sessionStorage.removeItem(APP_UNLOCKED_KEY);
}

export function isAppUnlocked() {
  return sessionStorage.getItem(APP_UNLOCKED_KEY) === "1";
}
