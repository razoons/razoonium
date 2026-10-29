// Notifications push — importé dans le service worker généré par vite-plugin-pwa

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Le Château des Ténèbres', {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  }));
});

// Clic : réutilise un onglet de l'appli s'il existe, sinon en ouvre un
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (client) {
      await client.focus();
      return client.navigate(url);
    }
    return self.clients.openWindow(url);
  })());
});
