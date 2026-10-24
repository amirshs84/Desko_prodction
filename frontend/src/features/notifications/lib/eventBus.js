/** pub/sub سبک بین adapterها و UI (toast داخل اپ، مودال in-app، شمارنده‌ی خوانده‌نشده). */
const listeners = new Map();

export const NotifyEvents = {
  RECEIVED: 'received', // نوتیف رسید وقتی اپ باز است → toast
  IN_APP: 'in_app', // پیام داخل اپ (مودال/شیت/Lottie)
  INBOX_CHANGED: 'inbox_changed',
};

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emit(event, payload) {
  listeners.get(event)?.forEach((h) => {
    try {
      h(payload);
    } catch (err) {
      console.error('[notify] listener failed', err);
    }
  });
}
