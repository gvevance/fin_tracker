import { waitForAuth, loginHref } from "./auth.js";

export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace(loginHref());
    return null;
  }
  return user;
}
