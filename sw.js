const CACHE_NAME = 'scheunentor-v1';
const urlsToCache = [
  '/Scheunentor-zum-Olymp/',
  '/Scheunentor-zum-Olymp/index.html',
  '/Scheunentor-zum-Olymp/styles.css',
  '/Scheunentor-zum-Olymp/app.js',
  '/Scheunentor-zum-Olymp/manifest.json',
  'https://i.imgur.com/vCwczZs.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
