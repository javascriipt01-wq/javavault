/* Java Vault service worker, built for weak networks.
   - The app page: try the network for up to 4 seconds, then use the saved copy.
   - Libraries and fonts (Firebase SDK, icons, PDF, fonts): saved after the first load,
     served instantly from the phone afterwards, refreshed quietly in the background.
   - Live data calls (Firestore, login, payments): never touched. */
const CACHE = 'javavault-v3';
const PRECACHE = ['javavault.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
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
