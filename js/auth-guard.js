import { waitForAuth } from "./auth.js";
import { lockApp } from "./session.js";

const LOGIN_PATH = "login.html";

export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    lockApp();
    const returnTo = encodeURIComponent(
      window.location.pathname.split("/").pop() || "index.html"
    );
    window.location.replace(`${LOGIN_PATH}?return=${returnTo}`);
    return null;
  }
  return user;
}
