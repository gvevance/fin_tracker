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
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      });
      return;
    }

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("sw.js", { scope: "./" })
      .then((registration) => {
        registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage("skipWaiting");
        }
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
}
