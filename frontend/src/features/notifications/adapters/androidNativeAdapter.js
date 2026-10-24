import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

/** پلاگین native (frontend/android/.../notifications/DeskoNotificationsPlugin.java) */
const DeskoNotifications = registerPlugin('DeskoNotifications');

export const androidNativeAdapter = {
  platform: 'ANDROID',
  supportsLocalSchedule: true,

  isSupported() {
    return Capacitor.getPlatform() === 'android';
  },

  async permissionState() {
    const status = await PushNotifications.checkPermissions();
    return status.receive;
  },

  async requestPermission() {
    let status = await PushNotifications.checkPermissions();
    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions();
    }
    return status.receive;
  },

  async getToken() {
    await DeskoNotifications.ensureChannels();
    // register() مقداردهی اولیه‌ی FCM را تضمین می‌کند؛ توکن را از پلاگین خودمان می‌گیریم
    await PushNotifications.register();
    const { token } = await DeskoNotifications.getToken();
    return token;
  },

  setCredentials({ apiBase, deviceId, deviceSecret, accessToken }) {
    return DeskoNotifications.setTrackingCredentials({ apiBase, deviceId, deviceSecret, accessToken });
  },

  clearCredentials() {
    return DeskoNotifications.clearTrackingCredentials();
  },

  onToken(cb) {
    return DeskoNotifications.addListener('tokenReceived', (e) => cb(e.token));
  },

  onReceived(cb) {
    return DeskoNotifications.addListener('notificationReceived', cb);
  },

  /** cb({ notification, actionId, deeplink, opened }) — رویداد ثبت (tracking) را native انجام داده است. */
  onAction(cb) {
    return DeskoNotifications.addListener('notificationActionPerformed', cb);
  },

  scheduleLocal(items) {
    return DeskoNotifications.scheduleLocal({ items });
  },

  cancelLocal(sourceKeys) {
    return DeskoNotifications.cancelLocal({ sourceKeys });
  },

  cancelAllLocal() {
    return DeskoNotifications.cancelAllLocal();
  },

  showNow(notification) {
    return DeskoNotifications.showNow({ notification });
  },

  flushTracking() {
    return DeskoNotifications.flushTracking();
  },
};
