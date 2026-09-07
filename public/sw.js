// PashuRakshak Service Worker for Offline Caching
const CACHE_NAME = "pashurakshak-v1";
const STATIC_ASSETS = [
  "/",
  "/report",
  "/manifest.json",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never intercept public API requests, dev assets, or non-GET requests with cache
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("@vite") ||
    event.request.url.includes("node_modules") ||
    event.request.url.includes("virtual:") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline and request is for page navigation, fallback to cached /report or /
          if (event.request.mode === "navigate") {
            return caches.match("/report") || caches.match("/");
          }
        });
    })
  );
});
