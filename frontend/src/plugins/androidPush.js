import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const CHANNEL_ID = 'desko_push';
let started = false;

export function initAndroidPush() {
  if (started || Capacitor.getPlatform() !== 'android') return;
  started = true;
  void start();
}

async function start() {
  try {
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'اعلان‌ها',
      description: 'پیام‌های Desko',
      importance: 4,
      visibility: 1,
      vibration: true,
    });

    let status = await PushNotifications.checkPermissions();
    if (status.receive !== 'granted') {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== 'granted') {
      console.warn('DESKO_FCM_PERMISSION', status.receive);
      return;
    }

    await PushNotifications.addListener('registration', (token) => {
      console.info('DESKO_FCM_TOKEN', token.value);
    });
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('DESKO_FCM_ERROR', error.error);
    });

    await PushNotifications.register();
  } catch (error) {
    console.error('DESKO_FCM_ERROR', error);
  }
}
