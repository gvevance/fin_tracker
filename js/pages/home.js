import { requireAuth } from "../auth-guard.js";
import { signOut } from "../auth.js";

const user = await requireAuth();
if (!user) return;

const signOutBtn = document.getElementById("sign-out-btn");
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await signOut();
    window.location.replace("login.html");
  });
}
