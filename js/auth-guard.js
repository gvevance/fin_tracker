import { waitForAuth } from "./auth.js";

const LOGIN_PATH = "login.html";

export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    const returnTo = encodeURIComponent(
      window.location.pathname.split("/").pop() || "index.html"
    );
    window.location.replace(`${LOGIN_PATH}?return=${returnTo}`);
    return null;
  }
  return user;
}
