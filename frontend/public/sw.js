/**
 * Service Worker de Gestoría eMadrid Chat
 * - Hace la app instalable y muestra una página propia si no hay conexión.
 * - Recibe las notificaciones push y abre el canal correcto al tocarlas.
 * No cachea la app: así cada despliegue se ve al momento.
 */
const OFFLINE_CACHE = 'emadrid-offline-v1';
const OFFLINE_ASSETS = ['/offline.html', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Gestoría eMadrid', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil((async () => {
    // Si ya tienes el chat delante, no molestar: la app ya avisa con sonido
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some((w) => w.focused && w.visibilityState === 'visible')) return;

    if (self.navigator.setAppBadge) {
      self.navigator.setAppBadge().catch(() => {});
    }

    await self.registration.showNotification(data.title || 'Gestoría eMadrid', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.channel ? 'channel-' + data.channel : undefined,
      renotify: true,
      timestamp: Date.now(),
      data: { channel: data.channel || '' }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const channel = event.notification.data?.channel || '';

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'open-channel', channel });
      return;
    }
    await self.clients.openWindow(channel ? '/?channel=' + encodeURIComponent(channel) : '/');
  })());
});
