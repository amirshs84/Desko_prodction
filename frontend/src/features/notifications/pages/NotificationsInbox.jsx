import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifyApi } from '../api/notifyApi';
import { performAction } from '../components/NotificationActions';
import { normalizeNotification } from '../lib/normalize';

const PRIORITY_DOT = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-brand',
  NORMAL: 'bg-ink-4',
  LOW: 'bg-ink-4/50',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60).toLocaleString('fa-IR')} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600).toLocaleString('fa-IR')} ساعت پیش`;
  return new Date(iso).toLocaleDateString('fa-IR');
}

export default function NotificationsInbox() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['notify', 'inbox'],
    queryFn: ({ pageParam }) => notifyApi.inbox({ before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_before || undefined,
  });

  const markAll = useMutation({
    mutationFn: () => notifyApi.markRead(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notify'] }),
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items).map(normalizeNotification);
  const unread = query.data?.pages?.[0]?.unread_count ?? 0;

  return (
    <div className="h-full bg-page text-ink flex flex-col overflow-hidden" dir="rtl">
      <div className="shrink-0 px-4 pt-6 pb-4 flex items-center gap-3 border-b border-edge">
        <button type="button" onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-xl bg-panel flex items-center justify-center text-ink-2">
          →
        </button>
        <h1 className="text-lg font-bold flex-1">اعلان‌ها</h1>
        {unread > 0 && (
          <button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending}
                  className="text-xs text-brand font-semibold">
            خواندن همه
          </button>
        )}
        <button type="button" onClick={() => navigate('/settings/notifications')}
                className="text-xs text-ink-4">
          تنظیمات
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
          {query.isLoading && <p className="text-center text-sm text-ink-4 py-10">در حال بارگذاری…</p>}
          {query.isError && <p className="text-center text-sm text-red-400 py-10">خطا در دریافت اعلان‌ها</p>}
          {!query.isLoading && items.length === 0 && (
            <p className="text-center text-sm text-ink-4 py-16">اعلانی ندارید</p>
          )}

          {items.map((n) => (
            <button key={n.id} type="button" onClick={() => performAction(n)}
                    className={`w-full text-right flex gap-3 p-3 rounded-2xl border transition-colors
                                ${n.readAt ? 'bg-panel/40 border-edge' : 'bg-panel border-brand/30'}`}>
              <span className={`mt-2 w-2 h-2 rounded-full shrink-0 ${n.readAt ? 'bg-transparent' : PRIORITY_DOT[n.priority]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className={`text-sm truncate flex-1 ${n.readAt ? 'text-ink-2' : 'font-bold'}`}>{n.title}</p>
                  <span className="text-[10px] text-ink-4 shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="text-xs text-ink-4 mt-1 line-clamp-2">{n.body}</p>}
              </div>
              {n.media.imageUrl && (
                <img src={n.media.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              )}
            </button>
          ))}

          {query.hasNextPage && (
            <button type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}
                    className="w-full py-3 text-sm text-brand">
              {query.isFetchingNextPage ? '…' : 'بیشتر'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
