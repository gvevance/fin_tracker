const CACHE_NAME = "financial-tracker-v14";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "login.html",
  "monthly-expenses.html",
  "add-expense.html",
  "css/styles.css",
  "js/main.js",
  "js/firebase-config.js",
  "js/firebase.js",
  "js/auth.js",
  "js/auth-guard.js",
  "js/session.js",
  "js/expenses.js",
  "js/pages/home.js",
  "js/pages/login.js",
  "js/pages/add-expense.js",
  "js/pages/monthly-expenses.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("login.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
