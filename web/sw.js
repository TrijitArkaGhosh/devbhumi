/* App shell offline; API network-first with the last answer kept for poor signal at the ghats. */
const SHELL = 'devbhumi-shell-v17';
const FILES = ['/', '/index.html', '/app.css', '/app.js', '/i18n.js', '/i18n_v3.js', '/qr.js', '/qrscan.js', '/manifest.webmanifest', '/icon.svg', '/film.jpg', '/icon-192.png', '/apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== 'devbhumi-api').map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  if (u.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open('devbhumi-api').then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || new Response(JSON.stringify({ detail: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  const key = u.pathname.startsWith('/b/') ? '/index.html' : e.request;
  e.respondWith(caches.match(key).then(r => r || fetch(e.request)));
});
