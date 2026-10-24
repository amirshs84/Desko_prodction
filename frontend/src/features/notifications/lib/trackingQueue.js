import { notifyApi } from '../api/notifyApi';

const STORAGE_KEY = 'desko-notify-tracking-v1';
const MAX_QUEUE = 300;
const BATCH = 100;
const FLUSH_DELAY_MS = 3000;

let timer = null;
let flushing = false;

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * ثبت رویداد سمت JS (in-app، toast، وب). هر رویداد UUID دارد → ارسال دوباره idempotent است.
 * @param {'DELIVERED'|'DISPLAYED'|'OPENED'|'ACTION_CLICKED'|'DISMISSED'} type
 */
export function track(type, notification, { actionId, metadata } = {}) {
  if (!notification) return;
  const event = {
    id: uuid(),
    type,
    occurred_at: new Date().toISOString(),
    notification_id: notification.notification_id || notification.nid || notification.id || null,
    local_source_key: notification.local_source_key || '',
    category: notification.category || '',
    action_id: actionId || '',
    metadata: { platform: 'WEB', ...(metadata || {}) },
  };
  if (event.local_source_key) event.notification_id = null;
  write([...read(), event]);
  scheduleFlush();
}

export function scheduleFlush(delay = FLUSH_DELAY_MS) {
  clearTimeout(timer);
  timer = setTimeout(flush, delay);
}

export async function flush() {
  if (flushing || !localStorage.getItem('accessToken')) return;
  flushing = true;
  try {
    let queue = read();
    while (queue.length) {
      const batch = queue.slice(0, BATCH);
      try {
        await notifyApi.sendEvents(batch);
      } catch (err) {
        // 400 یعنی batch خراب است و تکرار فایده ندارد؛ بقیه‌ی خطاها بعداً دوباره
        if (err?.response?.status !== 400) return;
      }
      queue = read().slice(batch.length);
      write(queue);
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => scheduleFlush(500));
}
