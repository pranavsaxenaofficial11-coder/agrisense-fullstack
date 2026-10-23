// ==============================================================================
// AgriSense Resilient Service Worker (PWA Offline & Network-First Navigation)
// ==============================================================================
const CACHE_NAME = 'agrisense-v3';
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
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll notice:', err);
      });
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Bypass service worker for hardware camera, local subnets, WebSockets, and API calls
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/relay/') ||
    url.pathname.startsWith('/control') ||
    url.pathname.startsWith('/capture') ||
    url.pathname.startsWith('/stream') ||
    url.hostname === '192.168.4.1' ||
    url.hostname.startsWith('192.168.') ||
    url.hostname.startsWith('10.') ||
    url.port === '81' ||
    url.port === '8080'
  ) {
    return;
  }

  // 1. Navigation requests (Page Reloads & Link clicks) -> Network-First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(async () => {
          // Offline fallback: check cache for the specific URL, then app.html, then index.html
          const matchExact = await caches.match(req);
          if (matchExact) return matchExact;
          const matchApp = await caches.match('/app.html');
          if (matchApp) return matchApp;
          const matchIndex = await caches.match('/index.html');
          if (matchIndex) return matchIndex;
          const matchRoot = await caches.match('/');
          if (matchRoot) return matchRoot;

          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AgriSense Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:30px;text-align:center"><h2>🌱 AgriSense Farm Station</h2><p>Server connection reconnecting...</p><button onclick="location.reload()" style="background:#10b981;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:700">↻ Reload Dashboard</button></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Images) -> Cache-First with Network Revalidation
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Return cached, update in background
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req).catch(() => {
        return new Response('', { status: 404, statusText: 'Not found' });
      });
    })
  );
});
