const CACHE_NAME = 'zezepagnon-shell-v3';

// Assets statiques à précacher (shell de l'app)
const SHELL_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
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

  // Les appels API et fichiers uploadés ne sont jamais cachés
  // (données médicales + auth SaaS — /uploads exige le JWT)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets statiques : cache-first, réseau en fallback
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Met en cache les assets statiques (JS, CSS, images, fonts)
          if (
            response.ok &&
            (url.pathname.match(/\.(js|css|png|svg|ico|woff2?|ttf)$/) ||
              url.pathname === '/' ||
              url.pathname === '/index.html')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Hors ligne et asset non caché : retourne le shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
  }
});

// Mise à jour : notifie les clients qu'une nouvelle version est disponible
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
