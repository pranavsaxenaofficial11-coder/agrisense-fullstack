// ==============================================================================
// AgriSense Robust Service Worker (100% Offline Farm Dashboard & Asset Caching)
// ==============================================================================
const CACHE_NAME = 'agrisense-offline-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/logo.jpeg',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept camera LAN IP or external APIs
  if (url.hostname === '192.168.4.1' || url.hostname.startsWith('192.168.') || url.pathname.startsWith('/api/')) {
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache immediately, fetch fresh copy in background if online
        fetch(event.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, networkRes));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Offline fallback to app.html for HTML navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/app.html') || caches.match('/index.html');
        }
      });
    })
  );
});
