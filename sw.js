// RIA service worker.
// Offline reliability IS the product: this app has to open at 2am with no signal.
// Bump CACHE on every deploy so clients pick up the new shell.
const CACHE = 'ria-v13';

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg'
];

// INSTALL — precache the full shell. Individual failures must not
// abort the whole install, or one missing icon leaves the app with
// no offline cache at all.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        ASSETS.map(asset =>
          cache.add(asset).catch(err => console.warn('SW: could not cache', asset, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// ACTIVATE — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH — cache-first, with a navigation fallback to index.html so a
// deep link or a refresh still opens the app offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(response => {
      if (response) return response;
      return fetch(e.request).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
