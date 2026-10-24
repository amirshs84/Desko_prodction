import { API_BASE_URL } from '../../../api/config';

const PING_MS = 25000;
const MAX_BACKOFF_MS = 60000;

function wsUrl(token) {
  const apiUrl = new URL(API_BASE_URL, window.location.href);
  const proto = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${apiUrl.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

/** اتصال WebSocket با reconnect نمایی؛ onMessage({event, payload}) */
export function connectRealtime({ getToken, onMessage }) {
  let ws = null;
  let closed = false;
  let attempt = 0;
  let pingTimer = null;
  let retryTimer = null;

  const open = () => {
    const token = getToken();
    if (closed || !token) return;
    try {
      ws = new WebSocket(wsUrl(token));
    } catch {
      scheduleRetry();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      pingTimer = setInterval(() => ws?.readyState === 1 && ws.send('ping'), PING_MS);
    };
    ws.onmessage = (e) => {
      if (e.data === 'pong') return;
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        /* پیام نامعتبر */
      }
    };
    ws.onclose = (e) => {
      clearInterval(pingTimer);
      // 4401 = احراز نشد؛ تلاش دوباره فایده ندارد
      if (!closed && e.code !== 4401) scheduleRetry();
    };
    ws.onerror = () => ws?.close();
  };

  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) + Math.random() * 1000;
    attempt += 1;
    retryTimer = setTimeout(open, delay);
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible' && (!ws || ws.readyState > 1)) {
      attempt = 0;
      open();
    }
  };
  document.addEventListener('visibilitychange', onVisible);

  open();
  return {
    close() {
      closed = true;
      clearInterval(pingTimer);
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', onVisible);
      ws?.close();
    },
  };
}
