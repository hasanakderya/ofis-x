const CACHE_NAME = "ekinoks-personnel-cache-v1";
const ASSETS = [
  "/static/",
  "/static/index.html",
  "/static/js/app.js",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@latest",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;850&family=Space+Grotesk:wght@500;700&display=swap"
];

// Install Event - Pre-cache essential static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell and resources");
      return cache.addAll(ASSETS).catch((err) => {
        console.error("[Service Worker] Pre-cache failed. Some assets might be fetched progressively.", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve cached assets when offline; network first for others, ignore API routes from cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Leave API endpoints to the runtime app logic + local storage
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached file immediately, but fetch a fresh copy in the background (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* Ignore bg fetch errors when offline */
          });
        return cachedResponse;
      }

      // Fallback to network
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        
        // Cache new static resources progressively
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      // If offline and not in cache, fallback to main page if requesting navigation
      if (event.request.mode === "navigate") {
        return caches.match("/static/index.html") || caches.match("/static/");
      }
    })
  );
});
