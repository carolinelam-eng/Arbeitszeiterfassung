const CACHE = 'arbeitszeit-terminal-v2';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./src/styles.css','./src/app.js','./src/db.js','./src/time.js','./src/security.js'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
