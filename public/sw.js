// Service Worker PWA - SIMPLE VERSION
self.addEventListener('push', function(event) {
  console.log('📬 Push event received!');
  
  const data = event.data ? event.data.json() : {
    title: '📦 Ojek-O Delivery',
    body: 'Ada pesanan baru menunggu!',
    icon: '/icons/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/icons/icon-192x192.png',
      tag: 'delivery',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: '📱 Buka Aplikasi'
        }
      ]
    })
  );
});

self.addEventListener('notificationclick', function(event) {
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
