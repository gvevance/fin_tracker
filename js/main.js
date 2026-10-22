const isLocalDev =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "[::1]";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
