/**
 * Service worker: offline shell + real notifications.
 *
 * Pages and API calls always go to the network first, so data stays fresh.
 * Notifications arrive from the app (Push and notificationclick are handled
 * here), which is what makes an update actually reach a closed app.
 */

const CACHE = 'straybuddy-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never serve API responses or uploads from the cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
  );
});

/** Show a notification the page asked for (new sighting, urgent case...). */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'sb-notify') return;

  event.waitUntil(
    self.registration.showNotification(data.title || 'StrayBuddy', {
      body: data.body || 'There is an update near you.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'straybuddy',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

/** Push from a server (when a push service is wired up later). */
self.addEventListener('push', (event) => {
  let payload = { title: 'StrayBuddy', body: 'There is an update near you.', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag || 'straybuddy',
      renotify: true,
      data: { url: payload.url || '/' },
    })
  );
});

/** Tapping a notification opens (or focuses) the app at the right page. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
