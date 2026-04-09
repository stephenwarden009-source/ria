const CACHE = 'ria-v7'; // Increased version to force an update
const ASSETS = [
  './', 
  'index.html', 
  'manifest.json', 
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      console.log('Caching assets...');
      return c.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ... the rest of your activate and fetch listeners stay the same
