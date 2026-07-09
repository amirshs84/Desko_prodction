import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useManagerNotificationsQuery,
  useManagerUnreadNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  MANAGER_QUERY_KEYS,
} from '../../../../hooks/useManagerQueries';
import { mapApiNotifications } from '../utils/notificationDataTransformers';

/**
 * اعلان‌های پنل مدیر — همان API پنل دانش‌آموز، با shape سازگار با UI دمو.
 */
export function useManagerNotifications() {
  const queryClient = useQueryClient();
  const [locallyReadIds, setLocallyReadIds] = useState(() => new Set());

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerNotificationsQuery();

  const { data: unreadData } = useManagerUnreadNotificationsQuery();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const notifications = useMemo(() => {
    const mapped = mapApiNotifications(data?.notifications ?? []);
    if (locallyReadIds.size === 0) return mapped;
    return mapped.map((n) => (
      locallyReadIds.has(n.id) ? { ...n, unread: false } : n
    ));
  }, [data, locallyReadIds]);

  const serverUnread = unreadData?.unread_count ?? data?.unread_count ?? 0;
  const unreadNotificationCount = useMemo(() => {
    if (locallyReadIds.size === 0) return serverUnread;
    return notifications.filter((n) => n.unread).length;
  }, [locallyReadIds, notifications, serverUnread]);

  const markAllNotificationsRead = useCallback(async () => {
    setLocallyReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
    try {
      await markAllMutation.mutateAsync();
      setLocallyReadIds(new Set());
    } catch {
      /* optimistic UI حفظ می‌شود؛ با refetch بعدی sync می‌شود */
      queryClient.invalidateQueries({ queryKey: MANAGER_QUERY_KEYS.notifications() });
    }
  }, [markAllMutation, notifications, queryClient]);

  /** بک‌اند فقط mark-all دارد؛ تک‌تک فقط optimistic محلی است */
  const markNotificationRead = useCallback((id) => {
    setLocallyReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const errorMessage = isError
    ? (error?.response?.data?.error || 'خطا در بارگذاری اعلان‌ها')
    : null;

  return {
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    loading: isLoading,
    error: errorMessage,
    refresh: refetch,
  };
}
