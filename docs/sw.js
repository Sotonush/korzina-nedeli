// Работа без интернета: оболочка приложения из кэша, цены — сначала из сети, шрифты — из кэша с фоновым обновлением.
const VERSION = '16d838d24a';
const SHELL_CACHE = 'shell-' + VERSION;
const FONTS_CACHE = 'fonts-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const NAV_TIMEOUT = 3000; // столько ждём сеть при открытии, потом показываем сохранённую версию

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const cachedPage = () => caches.match('./index.html').then(r => r || caches.match('./'));

// Страница: сеть, но не дольше 3 секунд; дальше — сохранённая копия. Свежий ответ всё равно сохраняем.
function navigate(e){
  const net = fetch(e.request).then(r => {
    if (r && r.ok){ const copy = r.clone(); caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy)); }
    return r;
  });
  e.waitUntil(net.catch(() => {}));
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r){ done = true; clearTimeout(timer); resolve(r); } };
    const timer = setTimeout(() => { cachedPage().then(finish); }, NAV_TIMEOUT);
    net.then(finish, () => cachedPage().then(r => {
      if (r) finish(r);
      else if (!done){ done = true; clearTimeout(timer); resolve(Response.error()); }
    }));
  });
}

// Шрифты Google: отдаём из кэша сразу, в фоне обновляем (stale-while-revalidate).
function fonts(e){
  return caches.open(FONTS_CACHE).then(c => c.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; });
    if (hit){ e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){ e.respondWith(fonts(e)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/prices.json')){
    // Свежие цены, если есть сеть; иначе последние сохранённые.
    e.respondWith(fetch(e.request, { cache: 'no-cache' })
      .then(r => { if (r && r.ok){ const copy = r.clone(); caches.open('prices').then(c => c.put('./prices.json', copy)); } return r; })
      .catch(() => caches.match('./prices.json').then(r => r || Response.error())));
    return;
  }
  if (e.request.mode === 'navigate'){ e.respondWith(navigate(e)); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
