const CACHE_NAME = 'cota100-v5.0.0';

// LISTA ACTUALIZADA DE TODOS TUS ARCHIVOS PARA FUNCIONAMIENTO OFFLINE
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
  './niv-carreteras.html',
  './niv-poligonal.html',
  './poligonales.html',
  './pol-abierta.html',
  './pol-cerrada.html',
  './manifest.json',
  './icono.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché COTA100 instalada correctamente');
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
          // Si el nombre de la caché no es el actual, se elimina la versión vieja
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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo desde la memoria del celular (OFFLINE)
        if (response) {
          return response; 
        }
        // Si no está en memoria, intenta buscarlo en internet
        return fetch(event.request);
      })
  );
});
