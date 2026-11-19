const CACHE_NAME = 'cota100-v11.1';

const urlsToCache = [
  './',
  './index.html',
  './ajustes.html',
  './areas.html',
  './atmosfera.html',
  './coordenadas.html',
  './nivelacion.html',
  './niv-simple.html',
  './niv-alcan.html',
  './niv-poligonal.html',
  './niv-carreteras.html',
  './poligonales.html',
  './pol-abierta.html',
  './pol-cerrada.html',
  './poligonal.js',
  './manifest.json',
  './icono.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`Caché ${CACHE_NAME} instalada`);
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => console.warn('No se pudo pre-cachear:', url, err)))
        );
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Función auxiliar con Timeout de 2.5s contra "señal fantasma" en campo
function fetchConTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout de red en campo'));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ESTRATEGIA: NETWORK FIRST CON TIMEOUT RÁPIDO (2.5s) Y CACHÉ DE SDKs
self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (
    event.request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('accounts.google.com') ||
    url.includes('googleapis.com/identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    fetchConTimeout(event.request, 2500)
      .then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
