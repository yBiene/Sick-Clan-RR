self.addEventListener('push', event => {
 let data = {};
 try { data = event.data?.json() || {}; } catch { data = {}; }
 event.waitUntil(self.registration.showNotification(data.title || 'SICK CLAN', { body: data.body || 'Es gibt Neuigkeiten für dich.', tag: data.tag || 'sick-clan', data: { url: data.url || '/Sick-Clan-RR/#Benachrichtigungen' } }));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 const url = new URL(event.notification.data?.url || '/Sick-Clan-RR/', self.location.origin);
 if (url.origin !== self.location.origin) return;
 event.waitUntil(clients.openWindow(url.href));
});
