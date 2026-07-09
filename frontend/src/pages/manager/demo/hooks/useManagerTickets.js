import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useManagerTicketsQuery,
  useReplyToTicketMutation,
} from '../../../../hooks/useManagerQueries';
import { mapApiTickets, mapApiTicket } from '../utils/ticketDataTransformers';

/**
 * پیام‌های مشاوره دانش‌آموزان برای پنل مدیر دمو.
 * unread = بی‌پاسخ (reply null)
 */
export function useManagerTickets(filters = {}) {
  const [locallySeenIds, setLocallySeenIds] = useState(() => new Set());

  const queryFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      grade: filters.grade || undefined,
      status: filters.status || undefined,
    }),
    [filters.search, filters.grade, filters.status],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerTicketsQuery(queryFilters);

  const replyMutation = useReplyToTicketMutation();

  const tickets = useMemo(() => {
    const mapped = mapApiTickets(data?.tickets ?? []);
    if (locallySeenIds.size === 0) return mapped;
    return mapped.map((t) => (
      locallySeenIds.has(t.id) && t.unread
        ? { ...t, unread: false }
        : t
    ));
  }, [data, locallySeenIds]);

  /** badge هدر: بی‌پاسخ‌هایی که هنوز دیده نشده‌اند */
  const unreadMessageCount = useMemo(
    () => tickets.filter((t) => !t.reply && !locallySeenIds.has(t.id)).length,
    [tickets, locallySeenIds],
  );

  /** برای dropdown هدر: فقط بی‌پاسخ‌ها (جدید) */
  const recentMessages = useMemo(
    () => tickets.filter((t) => !t.reply).slice(0, 8),
    [tickets],
  );

  const markMessageRead = useCallback((id) => {
    setLocallySeenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllMessagesRead = useCallback(() => {
    setLocallySeenIds((prev) => {
      const next = new Set(prev);
      tickets.forEach((t) => next.add(t.id));
      return next;
    });
  }, [tickets]);

  const replyToTicket = useCallback(async (ticketId, reply) => {
    try {
      const updated = await replyMutation.mutateAsync({ ticketId, reply });
      return { ok: true, ticket: mapApiTicket(updated) };
    } catch (err) {
      return {
        ok: false,
        error: err?.response?.data?.error
          || err?.response?.data?.reply?.[0]
          || 'خطا در ارسال پاسخ',
      };
    }
  }, [replyMutation]);

  const errorMessage = isError
    ? (error?.response?.data?.error
      || (error?.response?.status === 403 ? 'دسترسی به پنل مدیریت ندارید' : 'خطا در بارگذاری پیام‌ها'))
    : null;

  return {
    tickets,
    recentMessages,
    unreadMessageCount,
    markMessageRead,
    markAllMessagesRead,
    replyToTicket,
    replyLoading: replyMutation.isPending,
    loading: isLoading,
    error: errorMessage,
    refresh: refetch,
  };
}

/** هوک سبک برای context هدر (بدون فیلتر) */
export function useManagerTicketsInbox() {
  return useManagerTickets({});
}
