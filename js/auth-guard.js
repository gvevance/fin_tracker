import { waitForAuth, loginHref, rememberUsername } from "./auth.js";

export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace(loginHref());
    return null;
  }
  rememberUsername(user).catch((err) => {
    console.error("Could not store username:", err);
  });
  return user;
}
