const CACHE_NAME = "financial-tracker-v28";

/** Icons only. Pages and scripts always come from the network so phones pick up updates. */
const PRECACHE_URLS = [
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

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
      Promise.all(keys.map((key) => caches.delete(key))).then(() =>
        caches.open(CACHE_NAME).then((cache) =>
          Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
        )
      )
    )
  );
  self.clients.claim();
});

function isAppFile(url) {
  return /\.(js|css|html)$/.test(url.pathname) || url.pathname.endsWith("/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" || isAppFile(url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
