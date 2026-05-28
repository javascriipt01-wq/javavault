// Java Vault Service Worker v1.0
// Enables offline mode and PWA installation

var CACHE_NAME = 'javavault-v1';
var OFFLINE_URLS = [
  '/',
  '/javavault.html',
  '/javavault-landing.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js'
];

// Install - cache all essential files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_URLS).catch(function(err) {
        console.warn('Cache failed for some URLs:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch - serve from cache, fall back to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET and cross-origin requests for Firebase
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com')) return;
  if (event.request.url.includes('googleapis.com/identitytoolkit')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/javavault.html');
        }
      });
    })
  );
});

// Background sync - sync data when internet returns
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-javavault') {
    event.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({type: 'SYNC_REQUEST'});
        });
      })
    );
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'Java Vault';
  var options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'javavault',
    data: { url: data.url || '/javavault.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/javavault.html')
  );
});
