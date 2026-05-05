// Nombre de la caché (Cambia el v1 a v2, v3, etc., cuando actualices tu código en el futuro)
const CACHE_NAME = 'cota100-v1';

// Lista de todos los archivos necesarios para que la app funcione offline
const urlsToCache = [
  './',
  './index.html',
  './ajustes.html',
  './nivelacion.html',
  './niv-poligonal.html',
  './manifest.json',
  // Agrega aquí el resto de tus archivos a medida que los vayas creando:
  // './niv-alcan.html',
  // './poligonales.html',
  // './icono.png'
];

// Evento de Instalación: Guarda los archivos en la caché del celular
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

// Evento de Activación: Limpia cachés antiguas si cambiaste el CACHE_NAME
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Evento Fetch: Intercepta las peticiones y responde con la caché si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo de la caché si existe
        if (response) {
          return response;
        }
        // Si no está en la caché, intenta descargarlo de la red
        return fetch(event.request).then(
          function(response) {
            // Verifica que la respuesta sea válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la respuesta porque es un stream de un solo uso
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});