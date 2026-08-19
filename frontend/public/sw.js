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

  if (event.request.method !== 'GET') return;

  // Navigations et shell : network-first — les déploiements frontend arrivent
  // sans bump de CACHE_NAME, le cache ne sert qu'en secours hors ligne
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets statiques (hashés par Vite, immuables) : cache-first, réseau en fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.pathname.match(/\.(js|css|png|svg|ico|woff2?|ttf)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Mise à jour : notifie les clients qu'une nouvelle version est disponible
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
