const CACHE = 'ria-v8';

const ASSETS = [
  './',
  'index.html'
];

// INSTALL
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      console.log('Caching app shell...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE (clear old caches)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// FETCH (cache-first)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
