const CACHE_NAME = "folia-cache-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && key !== "folia-model-cache" ? caches.delete(key) : undefined))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  if (
    e.request.url.includes("/diagnose") ||
    e.request.url.includes("/stats") ||
    e.request.url.includes("/logs")
  ) {
    return;
  }

  const isNavigation = e.request.mode === "navigate";

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", cacheCopy));
            return networkResponse;
          }
          return caches.match("/index.html").then((cached) => cached || networkResponse);
        })
        .catch(() => caches.match("/index.html"))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const networkFetch = fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const cacheCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
            }
            return networkResponse;
          })
          .catch(() => undefined);

        return cachedResponse || networkFetch;
      })
    );
  }
});
