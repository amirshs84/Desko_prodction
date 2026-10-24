/**
 * یکسان‌سازی نوتیف از منابع مختلف به یک شکل واحد برای UI:
 *   - DTO سرور (inbox / WebSocket / in-app pending)
 *   - PushPayload.toJson سمت native اندروید
 *   - data خام FCM در Service Worker وب (فیلدهای JSON به‌صورت رشته)
 */
function parseMaybeJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function normalizeNotification(raw) {
  if (!raw) return null;
  const media = parseMaybeJson(raw.media, {}) || {};
  const progress = raw.progress === '' || raw.progress == null ? null : Number(raw.progress);
  return {
    id: raw.notification_id || raw.nid || (raw.local_source_key || raw.source_key ? null : raw.id) || null,
    localSourceKey: raw.local_source_key || raw.source_key || null,
    source: raw.source || 'SERVER',
    category: raw.category || '',
    priority: raw.priority || 'NORMAL',
    title: raw.title || '',
    body: raw.body || '',
    style: raw.style || 'BASIC',
    media: {
      imageUrl: media.image_url || null,
      largeIconUrl: media.large_icon_url || null,
      lottieUrl: media.lottie_url || null,
    },
    actions: parseMaybeJson(raw.actions, []) || [],
    lines: parseMaybeJson(raw.lines, []) || [],
    progress: Number.isFinite(progress) ? progress : null,
    inApp: parseMaybeJson(raw.in_app, null),
    deeplink: raw.deeplink || null,
    createdAt: raw.created_at || null,
    readAt: raw.read_at || null,
  };
}

/** شکل مورد انتظار trackingQueue.track */
export function trackingRef(n) {
  return {
    notification_id: n?.id || null,
    local_source_key: n?.localSourceKey || '',
    category: n?.category || '',
  };
}
