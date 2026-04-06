const CACHE_NAME = 'cota100-v2'; // Cambiamos a V2 para forzar la actualización
const urlsToCache = [
  './',
  './index.html',
  './configuraciones.html',
  './nivelacion.html',
  './niv-simple.html',
  './niv-avanzada.html',
  './niv-lineal.html',
  './niv-poligonal.html',
  './poligonales.html',
  './pol-abierta.html',
  './pol-cerrada.html',
  './coordenadas.html',
  './atmosfera.html',
  './areas.html',
  './manifest.json',
  './icono.png' // Asegúrate de tener tu icono.png en la misma carpeta
];

// Instalar el Service Worker y guardar TODOS los nuevos archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché V2 abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar el Service Worker y ELIMINAR la caché antigua (v1) para no ocupar memoria basura
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
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