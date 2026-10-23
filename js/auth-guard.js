import { waitForAuth } from "./auth.js";

const LOGIN_PATH = "index.html";

export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace(LOGIN_PATH);
    return null;
  }
  return user;
}
