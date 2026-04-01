// ─── Cache version ────────────────────────────────────────────────────────────
// To push an update to users: bump this version string (e.g. v2, v3 …),
// then deploy.  The browser will install the new SW, delete the old cache,
// and serve fresh assets on the next page load.
const CACHE_NAME = 'favicons-pwa-v1.25';

// ─── Assets to pre-cache on install ───────────────────────────────────────────
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css?v=9c9bab95',
    '/js/main.js?v=e4f94528',
    '/vendor/bootstrap-icons/font/bootstrap-icons.min.css',
    '/vendor/bootstrap-icons/font/fonts/bootstrap-icons.woff2',
    '/vendor/bootstrap-icons/font/fonts/bootstrap-icons.woff',
    '/vendor/jszip/jszip.min.js',
    '/img/icon-512x512.png',
];

// ─── Install: pre-cache all assets ────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// ─── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ─── Fetch: cache-first, fall back to network ─────────────────────────────────
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (response.ok) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            });
        })
    );
});
