// HerdSentinel Service Worker
const CACHE_NAME = "herdsentinel-v2";
const isDev = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  // Immediately take over to purge stale development caches
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Purge all old caches (including herdsentinel-v1)
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      // In local development, unregister service worker completely so Vite HMR and dynamic scripts never get intercepted
      if (isDev) {
        return self.registration.unregister();
      }
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never intercept requests in development or on localhost
  if (isDev) {
    return;
  }

  // Never intercept API, dev assets, Vite modules, or non-GET requests
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("@vite") ||
    event.request.url.includes("node_modules") ||
    event.request.url.includes("virtual:") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Network-first strategy for pages to prevent stale code errors
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/report") || caches.match("/");
          }
        });
      })
  );
});
