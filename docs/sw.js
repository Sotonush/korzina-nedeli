// Работа без интернета: оболочка приложения из кэша, цены — сначала из сети.
const VERSION = '399e9e2c99';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open('shell-' + VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== 'shell-' + VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/prices.json')) {
    // Свежие цены, если есть сеть; иначе последние сохранённые.
    e.respondWith(fetch(e.request, { cache: 'no-cache' })
      .then(r => { const copy = r.clone(); caches.open('prices').then(c => c.put('./prices.json', copy)); return r; })
      .catch(() => caches.match('./prices.json')));
    return;
  }
  if (e.request.mode === 'navigate') {
    // Новая версия приложения, если есть сеть; без сети — сохранённая.
    e.respondWith(fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open('shell-' + VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
