const CACHE_NAME = "folia-cache-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png",
  "/favicon.svg",
  "/favicon.ico"
];

// Install event - caching the application shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clearing legacy caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network-First for HTML/Navigations, Stale-While-Revalidate for other static assets
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  
  // Do not intercept API backend transactions
  if (
    e.request.url.includes("/diagnose") || 
    e.request.url.includes("/stats") || 
    e.request.url.includes("/logs")
  ) {
    return;
  }

  const isNavigation = e.request.mode === "navigate" || e.request.url.endsWith(".html") || e.request.url === self.location.origin + "/";

  if (isNavigation) {
    // Network-First strategy for document/navigation requests
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match("/index.html");
        })
    );
  } else {
    // Stale-While-Revalidate strategy for static assets
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const networkFetch = fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cacheCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, cacheCopy);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Silence network error
          });

        return cachedResponse || networkFetch;
      })
    );
  }
});
