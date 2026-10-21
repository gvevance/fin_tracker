if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
