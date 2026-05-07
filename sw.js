const CACHE_NAME = 'cota100-v4.0.1';

// AQUÍ DEBEN ESTAR LOS NOMBRES EXACTOS DE TUS ARCHIVOS
const urlsToCache = [
  './',
  './index.html',
  './nivelacion.html',
  './niv-simple.html',
  './niv-alcan.html',
  './niv-poligonal.html',
  './configuraciones.html',
  './manifest.json',
  './icono.png' // Ojo: asegúrate de que tu imagen se llame exactamente así
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierta correctamente');
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Devuelve el archivo de la memoria (OFFLINE)
        }
        return fetch(event.request); // Si no está en memoria, usa internet
      })
  );
});
