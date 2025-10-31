// Service Worker untuk Push Notification - VERSION IMPROVED
const CACHE_NAME = 'ojeko-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png'
];

self.addEventListener('install', function(event) {
  console.log('✅ Service Worker Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker Activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 🔥 PUSH NOTIFICATION HANDLER
self.addEventListener('push', function(event) {
  console.log('📬 Push event received!', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('❌ Push data parsing error:', error);
    data = {
      title: 'Ojek-O Delivery',
      body: 'Pesanan baru menunggu!',
      tag: 'general'
    };
  }

  const options = {
    body: data.body || 'Ada pesanan baru yang menunggu',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'delivery-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: '📱 Buka Aplikasi'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '📦 Ojek-O Delivery', 
      options
    ).then(() => {
      console.log('✅ Notification shown successfully');
    }).catch(error => {
      console.error('❌ Notification error:', error);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        for (let client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync untuk offline support
self.addEventListener('sync', function(event) {
  console.log('🔄 Background sync:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('🔄 Performing background sync...');
  // Implement background sync logic here
}
