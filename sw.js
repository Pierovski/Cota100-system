const CACHE_NAME = 'cota100-v1';
const urlsToCache = [
  './',
  './index.html',
  './nivelacion.html',
  './coordenadas.html',
  './poligonales.html',
  './atmosfera.html',
  './areas.html'
];

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar las peticiones de red para servir desde la caché si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Devuelve el archivo guardado offline
        }
        return fetch(event.request);
      })
  );
});