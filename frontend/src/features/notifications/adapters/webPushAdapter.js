import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messagingPromise = null;

/** firebase فقط برای گرفتن توکن روی صفحه لود می‌شود (lazy)؛ نمایش push را Service Worker خودمان انجام می‌دهد. */
function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = Promise.all([import('firebase/app'), import('firebase/messaging')]).then(
      async ([{ initializeApp, getApps }, messaging]) => {
        if (!(await messaging.isSupported())) return null;
        const app = getApps()[0] || initializeApp(firebaseConfig);
        return { messaging: messaging.getMessaging(app), getToken: messaging.getToken, deleteToken: messaging.deleteToken };
      },
    );
  }
  return messagingPromise;
}

function swMessages(type, cb) {
  const handler = (event) => {
    if (event.data?.type === type) cb(event.data.payload);
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return { remove: () => navigator.serviceWorker.removeEventListener('message', handler) };
}

async function postToWorker(message) {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage(message);
}

export const webPushAdapter = {
  platform: 'WEB',
  supportsLocalSchedule: false,

  isSupported() {
    return (
      !Capacitor.isNativePlatform() &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      Boolean(firebaseConfig.apiKey && firebaseConfig.appId && VAPID_KEY)
    );
  },

  async permissionState() {
    const p = Notification.permission;
    return p === 'default' ? 'prompt' : p;
  },

  /** مرورگرها درخواست مجوز را فقط بعد از تعامل کاربر (کلیک) قبول می‌کنند. */
  async requestPermission() {
    const p = await Notification.requestPermission();
    return p === 'default' ? 'prompt' : p;
  },

  async getToken() {
    const fm = await getMessagingInstance();
    if (!fm) return null;
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    return fm.getToken(fm.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
  },

  setCredentials(credentials) {
    return postToWorker({ type: 'desko-credentials', payload: credentials });
  },

  async clearCredentials() {
    await postToWorker({ type: 'desko-credentials', payload: null });
    const fm = await getMessagingInstance();
    if (fm) await fm.deleteToken(fm.messaging).catch(() => {});
  },

  onToken() {
    return { remove() {} };
  },

  onReceived(cb) {
    return swMessages('desko-push', cb);
  },

  onAction(cb) {
    return swMessages('desko-notification-click', cb);
  },

  /** اگر SW پنجره‌ی جدید باز کرد، اطلاعات کلیک در query می‌آید. */
  consumeLaunchAction() {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get('__dn');
    if (!raw) return null;
    url.searchParams.delete('__dn');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  },

  scheduleLocal() {
    return Promise.resolve({ applied: 0 });
  },
  cancelLocal() {
    return Promise.resolve();
  },
  showNow() {
    return Promise.resolve({ shown: false });
  },
  flushTracking() {
    return postToWorker({ type: 'desko-flush' });
  },
};
