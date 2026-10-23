import { requireAuth } from "../auth-guard.js";
import { signOutToLogin } from "../auth.js";

const user = await requireAuth();
if (!user) return;

document.getElementById("sign-out-btn")?.addEventListener("click", () => {
  signOutToLogin().catch((err) => {
    console.error("Sign out failed:", err);
    window.location.replace("index.html");
  });
});
