const CACHE_NAME = 'cota100-v9.2';

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
  './poligonales.html',
  './pol-abierta.html',
  './pol-cerrada.html',
  './poligonal.js',
  './manifest.json',
  './icono.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché COTA100 v9.2 instalada');
        return cache.addAll(urlsToCache);
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

// ESTRATEGIA: NETWORK FIRST (Excluyendo llamadas dinámicas a Firebase/Google Auth)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // No interceptar ni cachear peticiones de autenticación o base de datos en la nube
  if (
    event.request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('accounts.google.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
