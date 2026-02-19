// Glory Pads - Custom Push Service Worker
// Handles push events and shows native system notifications

self.addEventListener('push', (event) => {
  let data = { title: 'Glory Pads', body: 'Nova notificação', icon: '/pwa-icon-192.png', badge: '/pwa-icon-192.png' };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || parsed.message || data.body,
        icon: parsed.icon || '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: parsed.tag || 'glory-pads-notification',
        data: parsed.data || {},
        url: parsed.url || '/',
      };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || 'glory-pads-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', () => {
  // Track dismissed notifications if needed
});
