import { isAppUnlocked, lockApp } from "../session.js";
import { requireAuth } from "../auth-guard.js";
import { signOutToLogin } from "../auth.js";

if (!isAppUnlocked()) {
  window.location.replace("login.html");
} else {
  const user = await requireAuth();
  if (!user) {
    lockApp();
    return;
  }

  document.getElementById("sign-out-btn")?.addEventListener("click", () => {
    signOutToLogin().catch((err) => {
      console.error("Sign out failed:", err);
      lockApp();
      window.location.replace("login.html");
    });
  });
}
