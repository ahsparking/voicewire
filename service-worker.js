// v2 — switched the app shell to "network-first" so updates to index.html show up
// immediately on next load instead of getting stuck on whatever was cached at install
// time. Offline use still works via the cache fallback below.
const CACHE_NAME = 'voicewire-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShell = isAppShellRequest(url);

  if (isSameOrigin && isAppShell) {
    // Network-first: always try to get the latest version when online.
    // Only fall back to the cached copy if the network request fails (offline).
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // All other requests (Google TTS API, fonts, icons, etc.) fall through to the network normally.
});

function isAppShellRequest(url) {
  return APP_SHELL.some((p) => url.pathname.endsWith(p.replace('./', '')) || url.pathname === '/');
}
