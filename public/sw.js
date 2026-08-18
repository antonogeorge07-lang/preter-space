/* Preter service worker: PWA install support + notification handling. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data && event.data.text() }; }
  const title = payload.title || 'Preter';
  const isCall = payload.kind === 'call';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || (isCall ? 'Incoming call' : 'You have a new message'),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
      tag: isCall ? 'preter-call' : 'preter-message',
      renotify: isCall,
      requireInteraction: isCall,
      vibrate: isCall ? [400, 200, 400, 200, 400] : undefined,
    })
  );
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
