// PodNest service worker — minimal offline app-shell cache
// bump CACHE_VERSION whenever a shell asset changes to force clients onto fresh files
const CACHE_VERSION = 'podnest-v1.00.3';

// the app shell — enough to boot the panel UI while offline
const SHELL = [
    '/',
    '/static/css/app.css',
    '/static/js/app.js',
    '/static/manifest.json'
];

// precache the shell on install, then take over without waiting for a reload
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
    );
    self.skipWaiting();
});

// purge caches left behind by older versions when this worker activates
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// fetch strategy — only ever touch same-origin GET requests
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // leave non-GET and cross-origin (CDN, c.pdn.st) requests completely alone
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    const url = new URL(req.url);

    // cache-first for versioned static assets — safe to serve stale, then backfill
    if (url.pathname.startsWith('/static/')) {
        event.respondWith(
            caches.match(req).then((hit) => hit || fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
                return res;
            }))
        );
        return;
    }

    // network-first for page navigations — fall back to the cached shell when offline.
    // everything else (API/JSON) is intentionally left to hit the network untouched
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/'))
        );
    }
});
