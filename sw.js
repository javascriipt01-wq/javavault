/* JobPay service worker, built for weak networks.
   - The app page: try the network for up to 4 seconds, then use the saved copy.
   - Libraries and fonts (Firebase SDK, icons, PDF, fonts): saved after the first load,
     served instantly from the phone afterwards, refreshed quietly in the background.
   - Live data calls (Firestore, login, payments): never touched. */
const CACHE = 'jobpay-v5';
const PRECACHE = ['javavault.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'sounds/coin-win.mp3'];
const LIBS = [
  'www.gstatic.com/firebasejs/',
  'cdnjs.cloudflare.com/',
  'fonts.googleapis.com/',
  'fonts.gstatic.com/',
  'upload.wikimedia.org/'
];
const LIVE = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
  'firebasestorage.googleapis.com', 'api.paystack.co', 'js.paystack.co', 'checkout.paystack.com',
  'google.com/recaptcha', 'firebaseinstallations.googleapis.com', 'sentry'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), ms)); }

function networkFirst(req, ms) {
  return Promise.race([fetch(req), timeout(ms)]).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('javavault.html')));
}

function staleWhileRevalidate(req) {
  return caches.match(req).then(cached => {
    const refresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => cached);
    return cached || refresh;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (LIVE.some(h => url.indexOf(h) !== -1)) return;

  if (url.startsWith(self.location.origin)) {
    e.respondWith(networkFirst(req, 4000));
    return;
  }
  if (LIBS.some(h => url.indexOf(h) !== -1)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});


/* Buttons on reminder notifications (Call, Navigate, Done, Snooze 1h) */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const act = e.action || 'open';
  const appUrl = 'javavault.html?todo=' + encodeURIComponent(d.id || '') + '&act=' + encodeURIComponent(act);
  const openApp = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ type: 'jv-todo', id: d.id, act }); return c.focus(); }
    }
    return self.clients.openWindow(appUrl);
  });
  if (act === 'call' && d.phone) {
    e.waitUntil(self.clients.openWindow('tel:' + String(d.phone).replace(/[^\d+]/g, '')).catch(openApp));
  } else if (act === 'nav' && d.addr) {
    e.waitUntil(self.clients.openWindow('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.addr)).catch(openApp));
  } else {
    e.waitUntil(openApp());
  }
});
