/* global self */
import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

/* ─── کش (همان رفتار generateSW قبلی) ─── */
setCacheNameDetails({ prefix: 'desko-exam-take-v4' });
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\.wasm$/i, /\/pdfium\//, /\/api\//, /\/ws\//],
  }),
);

registerRoute(
  ({ url }) => /\/pdfium\/.+\.(wasm|ttf)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'desko-pdfium',
    plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

/* ─── IndexedDB کوچک برای credential و صف رویدادها ─── */
const DB_NAME = 'desko-notify';
const STORE = 'kv';

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const kvGet = (key) => idb('readonly', (s) => s.get(key));
const kvSet = (key, value) => idb('readwrite', (s) => s.put(value, key));
const kvDel = (key) => idb('readwrite', (s) => s.delete(key));

function uuid() {
  if (self.crypto?.randomUUID) return self.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ─── tracking با هدرهای دستگاه (SW به JWT دسترسی ندارد) ─── */
async function flushEvents() {
  const creds = await kvGet('credentials');
  const queue = (await kvGet('events')) || [];
  if (!creds || !queue.length) return;
  const batch = queue.slice(0, 100);
  try {
    const res = await fetch(`${creds.apiBase}notify/events/batch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': creds.deviceId,
        'X-Device-Secret': creds.deviceSecret,
      },
      body: JSON.stringify({ events: batch }),
    });
    // 4xx = داده‌ی نامعتبر یا دستگاه حذف‌شده؛ نگه داشتن فایده‌ای ندارد
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      const rest = ((await kvGet('events')) || []).filter((e) => !batch.some((b) => b.id === e.id));
      await kvSet('events', rest);
    }
  } catch {
    /* آفلاین: دفعه‌ی بعد */
  }
}

async function track(type, data, { actionId = '', metadata = {} } = {}) {
  const queue = (await kvGet('events')) || [];
  queue.push({
    id: uuid(),
    type,
    occurred_at: new Date().toISOString(),
    notification_id: data?.nid || null,
    local_source_key: '',
    category: data?.category || '',
    action_id: actionId,
    metadata: { ...metadata, platform: 'WEB', via: 'sw' },
  });
  await kvSet('events', queue.slice(-300));
  await flushEvents();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function windowClients() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
}

/* ─── push ─── */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    const json = event.data?.json() || {};
    data = json.data || json;
  } catch {
    return;
  }
  if (data.v !== '1' || !data.title) return;

  event.waitUntil(
    (async () => {
      if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return;
      const clients = await windowClients();
      const focused = clients.find((c) => c.focused || c.visibilityState === 'visible');

      // اپ باز است: نمایش داخل اپ (toast) — به‌جز CRITICAL که همیشه نوتیف سیستمی هم می‌گیرد
      if (focused && data.priority !== 'CRITICAL') {
        focused.postMessage({ type: 'desko-push', payload: data });
        await track('DELIVERED', data, { metadata: { surface: 'foreground' } });
        return;
      }

      const media = parseJson(data.media, {});
      const actions = parseJson(data.actions, []);
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: media.large_icon_url || '/icon-192.png',
        badge: '/icon-192.png',
        image: media.image_url || undefined,
        tag: data.collapse_key || data.nid,
        renotify: Boolean(data.collapse_key),
        requireInteraction: data.priority === 'CRITICAL' || data.priority === 'HIGH',
        dir: 'rtl',
        lang: 'fa',
        data,
        actions: actions
          .filter((a) => a.type !== 'DISMISS' || actions.length > 1)
          .slice(0, 2)
          .map((a) => ({ action: a.id, title: a.title })),
      });
      await track('DISPLAYED', data);
    })(),
  );
});

/* ─── کلیک ─── */
self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  const data = n.data || {};
  const actions = parseJson(data.actions, []);
  const action = event.action ? actions.find((a) => a.id === event.action) : null;
  n.close();

  event.waitUntil(
    (async () => {
      await track(action ? 'ACTION_CLICKED' : 'OPENED', data, { actionId: action?.id || '' });
      if (action?.type === 'DISMISS') return;
      if (action?.type === 'API_CALL') {
        const creds = await kvGet('credentials');
        if (creds?.accessToken) {
          await fetch(`${creds.apiBase}${action.api_path.replace(/^\//, '')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.accessToken}` },
            body: JSON.stringify({ notification_id: data.nid }),
          }).catch(() => {});
        }
        return;
      }

      const deeplink = action?.deeplink || data.deeplink || '/';
      const payload = { notification: data, actionId: action?.id || null, deeplink, opened: true };
      const clients = await windowClients();
      const client = clients[0];
      if (client) {
        await client.focus().catch(() => {});
        client.postMessage({ type: 'desko-notification-click', payload });
        return;
      }
      const url = new URL(data.link || deeplink, self.location.origin);
      url.searchParams.set('__dn', encodeURIComponent(JSON.stringify(payload)));
      await self.clients.openWindow(url.toString());
    })(),
  );
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(track('DISMISSED', event.notification.data || {}));
});

/* ─── پیام از صفحه ─── */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (type === 'desko-credentials') {
    event.waitUntil(payload ? kvSet('credentials', payload).then(flushEvents) : kvDel('credentials'));
  } else if (type === 'desko-flush') {
    event.waitUntil(flushEvents());
  }
});
