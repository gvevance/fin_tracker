import { requireAuth } from "../auth-guard.js";
import { signOut, waitUntilSignedOut } from "../auth.js";

document.getElementById("sign-out-btn")?.addEventListener("click", async () => {
  try {
    await signOut();
    await waitUntilSignedOut();
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  window.location.replace("login.html");
});

const user = await requireAuth();
if (!user) return;
