import api from '../../../api/client';
import { notifyApi } from '../api/notifyApi';
import { openDeepLink } from '../lib/deepLink';
import { emit, NotifyEvents } from '../lib/eventBus';
import { trackingRef } from '../lib/normalize';
import { track } from '../lib/trackingQueue';

/** رفتار مشترک کلیک روی بدنه یا دکمه‌ی نوتیف در UI داخل اپ. */
export async function performAction(n, action) {
  if (!action) {
    track('OPENED', trackingRef(n));
    markRead(n);
    openDeepLink(n.deeplink);
    return;
  }
  track('ACTION_CLICKED', trackingRef(n), { actionId: action.id });
  markRead(n);
  if (action.type === 'API_CALL' && action.api_path) {
    await api.post(action.api_path, { notification_id: n.id }).catch(() => {});
  } else if (action.type === 'OPEN') {
    openDeepLink(action.deeplink || n.deeplink);
  }
}

export function dismiss(n) {
  track('DISMISSED', trackingRef(n));
  markRead(n);
}

function markRead(n) {
  if (!n?.id) return;
  notifyApi
    .markRead([n.id])
    .then(() => emit(NotifyEvents.INBOX_CHANGED))
    .catch(() => {});
}
