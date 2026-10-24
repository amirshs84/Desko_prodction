import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '../../api/config';
import { notifyApi } from './api/notifyApi';
import { androidNativeAdapter } from './adapters/androidNativeAdapter';
import { noopAdapter } from './adapters/noopAdapter';
import { webPushAdapter } from './adapters/webPushAdapter';
import { openDeepLink } from './lib/deepLink';
import { emit, NotifyEvents } from './lib/eventBus';
import { normalizeNotification, trackingRef } from './lib/normalize';
import { connectRealtime } from './lib/realtime';
import { flush, track } from './lib/trackingQueue';

const DEVICE_KEY = 'desko-notify-device-v1';
const LOCAL_CURSOR_KEY = 'desko-notify-local-cursor-v1';
const LOCAL_SYNC_INTERVAL_MS = 30 * 60 * 1000;

/** ترتیب انتخاب: اولین adapter پشتیبانی‌شده (Strategy). iOS در آینده فقط یک adapter جدید است. */
const ADAPTERS = [androidNativeAdapter, webPushAdapter, noopAdapter];

function absoluteApiBase() {
  return new URL(API_BASE_URL, window.location.href).toString();
}

function readDevice() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * Facade سمت کلاینت: ثبت دستگاه، کانال realtime، رویدادهای native/SW، sync یادآورهای لوکال.
 * UI فقط با eventBus و همین کلاس کار می‌کند و از جزئیات پلتفرم بی‌خبر است.
 */
class NotificationClient {
  adapter = noopAdapter;
  started = false;
  handles = [];
  realtime = null;
  seen = new Set();
  localTimer = null;

  get platform() {
    return this.adapter.platform;
  }

  async start() {
    if (this.started || !localStorage.getItem('accessToken')) return;
    this.started = true;
    this.adapter = ADAPTERS.find((a) => a.isSupported()) || noopAdapter;

    this.handles.push(await this.adapter.onReceived((raw) => this.handleIncoming(raw, 'push')));
    this.handles.push(await this.adapter.onAction((e) => this.handleAction(e)));
    this.handles.push(await this.adapter.onToken((token) => this.registerToken(token)));

    const launch = this.adapter.consumeLaunchAction?.();
    if (launch) this.handleAction(launch);

    this.realtime = connectRealtime({
      getToken: () => localStorage.getItem('accessToken'),
      onMessage: ({ event, payload }) => this.handleIncoming(payload, event === 'in_app' ? 'in_app' : 'realtime'),
    });

    // ثبت push فقط اگر مجوز از قبل داده شده (اندروید: درخواست خودکار؛ وب: نیاز به کلیک کاربر)
    const permission =
      this.adapter.platform === 'ANDROID'
        ? await this.adapter.requestPermission().catch(() => 'denied')
        : await this.adapter.permissionState().catch(() => 'denied');
    if (permission === 'granted') await this.registerPush().catch((e) => console.warn('[notify] push', e));

    this.loadPendingInApp();
    this.syncLocal();
    this.localTimer = setInterval(() => this.syncLocal(), LOCAL_SYNC_INTERVAL_MS);
    if (Capacitor.isNativePlatform()) {
      this.handles.push(
        await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) return;
          this.syncLocal();
          this.loadPendingInApp();
          flush();
        }),
      );
    }
    flush();
  }

  /** برای دکمه‌ی «فعال‌سازی اعلان‌ها» (وب نیاز به تعامل کاربر دارد). */
  async enablePush() {
    const permission = await this.adapter.requestPermission();
    if (permission === 'granted') await this.registerPush();
    return permission;
  }

  permissionState() {
    return this.adapter.permissionState();
  }

  async registerPush() {
    const token = await this.adapter.getToken();
    if (token) await this.registerToken(token);
  }

  async registerToken(token) {
    if (!token || !localStorage.getItem('accessToken')) return;
    const device = await notifyApi.registerDevice({
      platform: this.adapter.platform,
      token,
      app_version: import.meta.env.VITE_APP_VERSION || '',
      locale: 'fa',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran',
    });
    localStorage.setItem(
      DEVICE_KEY,
      JSON.stringify({ token, deviceId: device.device_id, platform: device.platform }),
    );
    await this.adapter.setCredentials({
      apiBase: absoluteApiBase(),
      deviceId: device.device_id,
      deviceSecret: device.tracking_secret,
      accessToken: localStorage.getItem('accessToken'),
    });
  }

  handleIncoming(raw, via) {
    const n = normalizeNotification(raw);
    if (!n) return;
    // push و WebSocket می‌توانند یک نوتیف را دوبار برسانند
    const key = `${via === 'in_app' ? 'inapp' : 'msg'}:${n.id || n.localSourceKey || n.title}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (this.seen.size > 200) this.seen = new Set([...this.seen].slice(-100));

    if (via === 'in_app') {
      emit(NotifyEvents.IN_APP, n);
      return;
    }
    if (via === 'realtime') track('DELIVERED', trackingRef(n), { metadata: { via } });
    emit(NotifyEvents.RECEIVED, n);
    emit(NotifyEvents.INBOX_CHANGED);
  }

  /** e: { notification, actionId, deeplink, opened } از native یا SW */
  handleAction(e) {
    const n = normalizeNotification(e?.notification);
    if (n?.inApp && !e.actionId) emit(NotifyEvents.IN_APP, n);
    if (e?.deeplink || n?.deeplink) openDeepLink(e.deeplink || n.deeplink);
    emit(NotifyEvents.INBOX_CHANGED);
  }

  async loadPendingInApp() {
    try {
      const items = await notifyApi.pendingInApp();
      items.forEach((raw) => this.handleIncoming(raw, 'in_app'));
    } catch {
      /* best-effort */
    }
  }

  async syncLocal() {
    if (!this.adapter.supportsLocalSchedule) return;
    try {
      const since = localStorage.getItem(LOCAL_CURSOR_KEY);
      const { items, server_time: serverTime } = await notifyApi.localSchedule(since);
      if (items.length) await this.adapter.scheduleLocal(items);
      localStorage.setItem(LOCAL_CURSOR_KEY, serverTime);
    } catch (err) {
      console.warn('[notify] local sync failed', err);
    }
  }

  /** نوتیف فوری سمت کلاینت (مثلا پایان تایمر). روی وب، به‌جای آن toast داخل اپ نمایش داده می‌شود. */
  async showLocalNow(notification) {
    const res = await this.adapter.showNow(notification).catch(() => ({ shown: false }));
    if (!res?.shown) emit(NotifyEvents.RECEIVED, normalizeNotification({ ...notification, source: 'LOCAL_CLIENT' }));
  }

  /** قبل از پاک شدن localStorage در logout صدا زده می‌شود. */
  async stop({ unregister = true } = {}) {
    const adapter = this.started ? this.adapter : ADAPTERS.find((a) => a.isSupported()) || noopAdapter;
    const device = readDevice();
    if (unregister && device?.token) {
      await notifyApi.unregisterDevice(device.token).catch(() => {});
    }
    await flush().catch(() => {});
    await adapter.cancelAllLocal?.().catch(() => {});
    await adapter.clearCredentials().catch(() => {});
    this.handles.forEach((h) => h?.remove?.());
    this.handles = [];
    this.realtime?.close();
    clearInterval(this.localTimer);
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(LOCAL_CURSOR_KEY);
    this.started = false;
    this.adapter = noopAdapter;
  }
}

export const notificationClient = new NotificationClient();
