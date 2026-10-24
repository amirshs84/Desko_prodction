import api from '../../../api/client';

/** کلاینت REST ماژول نوتیف جدید (/api/notify/). سیستم قدیمی notificationAPI جداست. */
export const notifyApi = {
  registerDevice: (payload) => api.post('notify/devices/', payload).then((r) => r.data),
  unregisterDevice: (token) => api.delete('notify/devices/', { data: { token } }),
  sendEvents: (events) => api.post('notify/events/batch/', { events }).then((r) => r.data),
  inbox: ({ before, limit = 20, unreadOnly = false } = {}) =>
    api
      .get('notify/inbox/', { params: { before, limit, unread: unreadOnly ? 1 : undefined } })
      .then((r) => r.data),
  markRead: (ids) => api.post('notify/inbox/read/', ids ? { ids } : { all: true }).then((r) => r.data),
  unreadCount: () => api.get('notify/inbox/unread-count/').then((r) => r.data.unread_count),
  pendingInApp: () => api.get('notify/in-app/pending/').then((r) => r.data.items),
  preferences: () => api.get('notify/preferences/').then((r) => r.data),
  updatePreferences: (payload) => api.put('notify/preferences/', payload).then((r) => r.data),
  localSchedule: (since) =>
    api.get('notify/local-schedule/', { params: { since: since || undefined } }).then((r) => r.data),
};
