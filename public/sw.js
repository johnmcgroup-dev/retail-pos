// My Retailer Pro — Service Worker
// Strategy: cache-first for assets, network-first for API calls
// Bump this version whenever you deploy a meaningful change so old
// service-worker caches are wiped on activation. This is what guarantees
// every device runs the SAME (latest) version of the app.
const CACHE_NAME = 'retailer-pro-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean ALL old caches and take over clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy — NETWORK FIRST so users always get the newest deployed code.
// Cache is only used as a fallback when the network is unavailable (offline).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API / backend calls
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const fetchFromNetworkAndCache = (cacheFallback) =>
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => cacheFallback);

  // Navigation requests — newest HTML from network, offline → cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS / CSS / images — newest from network first, fall back to cache only when offline
  event.respondWith(
    caches.match(request).then((cached) => fetchFromNetworkAndCache(cached))
  );
});
