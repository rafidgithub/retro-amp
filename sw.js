// RetroAmp's service worker (registered by js/core/pwa.js after consent).
// 1. Keeps a copy of RetroAmp's own files so the installed app opens offline.
//    Network first, so an update shows up on the next launch; the copy is only
//    used when the network isn't there. Never cached: the search API (/api/),
//    anything from another site (YouTube, thumbnails) and partial (range)
//    requests. No personal data lives here, just the app's files.
// 2. Shows Notes reminder notifications and hands clicks on them back to an
//    open RetroAmp window (js/notes/remind.js), or opens one.
const CACHE = 'retroamp-shell-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest'])).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('retroamp-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const ours = url => {
  const u = new URL(url);
  return u.origin === self.location.origin && !u.pathname.startsWith('/api/');
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range') || !ours(req.url)) return;
  e.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
        }
        return res;
      } catch {
        const navigate = req.mode === 'navigate';
        return (await caches.match(req, { ignoreSearch: navigate })) || (navigate && (await caches.match('./'))) || Response.error();
      }
    })(),
  );
});

// The page lists the files it loaded before this worker took over, so the first
// offline launch has them too.
self.addEventListener('message', e => {
  if (e.data?.type !== 'retroamp-precache' || !Array.isArray(e.data.urls)) return;
  const urls = e.data.urls.filter(u => typeof u === 'string' && ours(u)).slice(0, 300);
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(urls.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = e.notification.data?.id;
  const action = e.action || 'open';
  if (!id) return;
  e.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find(c => new URL(c.url).origin === self.location.origin);
      if (tab) {
        tab.postMessage({ type: 'retroamp-note', action, id });
        if (action === 'open') await tab.focus();
      } else if (action !== 'done') {
        const url = new URL('./', self.location);
        url.searchParams.set('note', id);
        if (action === 'snooze') url.searchParams.set('snooze', '1');
        await self.clients.openWindow(url.href);
      }
    })(),
  );
});
