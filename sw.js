/* sw.js — offline support for Mr. Ganick 有机农药目录 · Organic Catalogue
 *
 * The app is a single self-contained index.html (React, data, CSS, and icons
 * are all inlined). There are no external runtime resources, so once the page
 * is cached the whole app works with no connection.
 *
 * Strategy:
 *   1) Page (navigation): network-first → always fresh when online, cached copy
 *      when offline. App updates flow automatically; no manual cache busting
 *      needed for content changes.
 *   2) Other same-origin GETs: cache-first, then network.
 *   3) Cross-origin requests: untouched — handled normally by the browser.
 *
 * Bump CACHE_VERSION to force every device to drop old caches.
 */
const CACHE_VERSION = 'ganick-catalogue-v1.11.3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1) The HTML page itself — network-first, fall back to cache (enables offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match('./index.html'))
            .then((r) => r || caches.match('./'))
        )
    );
    return;
  }

  // 2) Any other same-origin GET — cache-first, fall back to network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
              return res;
            })
            .catch(() => cached)
      )
    );
  }
  // 3) Cross-origin requests fall through to the network untouched.
});
