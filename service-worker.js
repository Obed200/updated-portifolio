const CACHE_NAME = 'portfolio-cache-v1';
const CORE_ASSETS = [
  '/',                  // index.html (or start_url)
  '/index.html',
  '/offline.html',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add other assets that are essential (css, js, images)
  // e.g. '/styles.css', '/script.js', '/user.JPG'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // For navigation requests (pages) — try network first, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        // update cache with the latest response (optional)
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => {
        return caches.match(request).then(cached => cached || caches.match('/offline.html'));
      })
    );
    return;
  }

  // For other requests — cache-first strategy
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(networkResponse => {
        // Put a copy in cache for future
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // If request is for an image and fails, optionally return a placeholder
        if (request.destination === 'image') {
          return caches.match('/logo.png');
        }
      });
    })
  );
});
