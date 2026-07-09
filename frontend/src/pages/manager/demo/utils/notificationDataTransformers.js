/**
 * تبدیل اعلان API به shape مورد استفاده UI دموی مدیر.
 * API: { id, title, body, created_at, is_read }
 * UI:  { id, title, desc, time, unread, type }
 */

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'دیروز';
  return `${days} روز پیش`;
}

function inferType(title = '', body = '') {
  const text = `${title} ${body}`;
  if (/غیبت|هشدار|خطر|تأخیر|تاخیر|اخطار/i.test(text)) return 'warning';
  if (/ثبت|موفق|تأیید|تایید|نمره/i.test(text)) return 'success';
  return 'info';
}

export function mapApiNotification(n) {
  return {
    id: n.id,
    title: n.title || '',
    desc: n.body || '',
    time: timeAgo(n.created_at),
    unread: !n.is_read,
    type: inferType(n.title, n.body),
    createdAt: n.created_at,
  };
}

export function mapApiNotifications(list = []) {
  return list.map(mapApiNotification);
}
