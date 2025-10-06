const CACHE_NAME = 'sup-experience-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/data.json',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  const isNavigation = request.mode === 'navigate';
  const isHTML = request.destination === 'document';
  const isData = request.url.endsWith('/data.json');

  if (isNavigation || isHTML || isData) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(response => response || fetch(request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return networkResponse;
    }))
  );
});
