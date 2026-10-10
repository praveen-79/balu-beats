const CACHE_NAME = 'balu-beats-v10';
const ASSETS = ['./', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept external telemetry, ntfy, or API requests
  if (url.origin !== location.origin || url.pathname.includes('/api/')) {
    return;
  }

  // Network-first for all local pages so telemetry and app updates are always live
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200 && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
