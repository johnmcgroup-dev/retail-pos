// Network-only service worker — enables PWA installability without caching.
// The app always fetches fresh data from the server.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through: let the browser handle all requests normally (no caching).
self.addEventListener('fetch', (event) => {});
