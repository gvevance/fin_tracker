import { requireAuth } from "../auth-guard.js";
import { signOutToLogin } from "../auth.js";

function bindSignOut() {
  const signOutBtn = document.getElementById("sign-out-btn");
  if (!signOutBtn || signOutBtn.dataset.bound === "1") return;

  signOutBtn.dataset.bound = "1";
  signOutBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    signOutBtn.disabled = true;
    signOutBtn.textContent = "Signing out…";
    signOutToLogin();
  });
}

bindSignOut();
requireAuth();
