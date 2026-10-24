/** محیط بدون پشتیبانی push (مرورگر قدیمی، dev بدون کلید): فقط WebSocket و inbox کار می‌کنند. */
const none = { remove() {} };

export const noopAdapter = {
  platform: 'NONE',
  supportsLocalSchedule: false,
  isSupported: () => true,
  permissionState: async () => 'unsupported',
  requestPermission: async () => 'unsupported',
  getToken: async () => null,
  setCredentials: async () => {},
  clearCredentials: async () => {},
  onToken: () => none,
  onReceived: () => none,
  onAction: () => none,
  scheduleLocal: async () => ({ applied: 0 }),
  cancelLocal: async () => {},
  showNow: async () => ({ shown: false }),
  flushTracking: async () => {},
};
