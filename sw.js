// RIA service worker.
//
// Offline reliability IS the product: this app has to open at 2am with no
// signal. But the previous cache-first-for-everything strategy meant a shipped
// fix could sit unseen on a phone indefinitely — the shell only changed when
// the browser noticed a byte-changed sw.js, installed it, and activated it. If
// any link in that chain stalls, the user keeps running the old app with no way
// to know. This app's crisis numbers ship inside index.html, so "stuck on an
// old build" is not a cosmetic risk.
//
// Strategy now:
//   navigations  → network first, short timeout, cached shell as fallback
//   everything else → cache first, refreshed in the background
//
// Offline still works: with no signal the navigation fetch fails immediately
// and the cached shell is served, exactly as before.
const CACHE = 'ria-v16';

// How long a navigation waits for the network before serving the cached shell.
// Deliberately short — an app that takes ten seconds to open at 2am has already
// failed, and the cached copy is never more than one launch stale.
const NAV_TIMEOUT_MS = 2500;

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg'
];

// The one cache key the offline shell is ever stored under, and the only two
// URLs allowed to write to it. Every navigation used to be written here
// regardless of what was navigated to, so any other same-origin page in scope
// — a stray build, a 404 page — became the app's offline shell after a single
// visit.
const SHELL_KEY = 'index.html';
const SCOPE_PATH = new URL('./', self.location).pathname;

function isShellRequest(url){
  return url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + 'index.html';
}

// INSTALL — precache the full shell. Individual failures must not abort the
// whole install, or one missing icon leaves the app with no offline cache.
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

// Rejects if the promise has not settled within ms. The underlying fetch is
// left running — if it lands late it simply updates the cache for next time.
function withTimeout(promise, ms){
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sw: network timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

// NAVIGATION — fresh shell when the network answers quickly, cached shell when
// it does not. Every successful fetch replaces the cached copy, so the offline
// fallback is the last good version rather than the version first installed.
// Stored under the fixed 'index.html' key so query strings (?v=…) cannot
// fragment the cache into one entry per launch.
async function handleNavigation(request){
  const cache = await caches.open(CACHE);
  try {
    const fresh = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if(fresh && fresh.ok){
      cache.put(SHELL_KEY, fresh.clone()).catch(err => console.warn('SW: shell not cached', err));
      return fresh;
    }
    throw new Error('sw: bad navigation response');
  } catch(err){
    const cached = await cache.match(SHELL_KEY) || await cache.match('./');
    if(cached) return cached;
    throw err;
  }
}

// ASSETS — serve from cache immediately, refresh in the background so the next
// launch has the newer copy. Icons and the manifest are never urgent enough to
// wait on the network for.
function handleAsset(event){
  return caches.open(CACHE).then(async cache => {
    const hit = await cache.match(event.request);
    const network = fetch(event.request).then(res => {
      if(res && res.ok) cache.put(event.request, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if(hit){
      event.waitUntil(network);
      return hit;
    }
    const res = await network;
    return res || Response.error();
  });
}

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  // Leave other origins alone entirely — the four meeting links in the app are
  // ordinary outbound navigations and are none of this worker's business.
  let url;
  try { url = new URL(e.request.url); } catch(err){ return; }
  if(url.origin !== self.location.origin) return;

  // Only the app entry point gets the network-first-with-cached-shell
  // treatment. Any other navigation in scope is left to the browser: serving
  // it the shell would be wrong, and caching it as the shell is the bug this
  // guard exists to prevent.
  if(e.request.mode === 'navigate'){
    if(isShellRequest(url)) e.respondWith(handleNavigation(e.request));
    return;
  }
  e.respondWith(handleAsset(e));
});
