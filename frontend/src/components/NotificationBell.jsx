import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { notificationAPI } from '../api/client';

/* ──────────────────────────────── helpers ──────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
}

/* ──────────────────────────────── BellIcon ──────────────────────────────── */
function BellIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11
           a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341
           C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436
           L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

/* iconSize: extra Tailwind size classes passed in by the caller (e.g. 'w-6 h-6') */

/* ──────────────────────────────── main ──────────────────────────────── */
/**
 * NotificationBell
 * Props:
 *  - className: extra classes for the trigger button
 *  - variant: 'dark' (default) | 'light'  — affects button colours
 */
export default function NotificationBell({ className = '', variant = 'dark', iconSize = 'w-5 h-5' }) {
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [notifications,  setNotifications]  = useState([]);
  const [isOpen,         setIsOpen]         = useState(false);
  const [loading,        setLoading]        = useState(false);
  const panelRef = useRef(null);

  /* ── polling تعداد نخوانده ── */
  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.unread_count ?? 0);
    } catch { /* سایلنت — polling نباید UI را خراب کند */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  /* ── باز کردن پنل: دریافت لیست + mark-all-read ── */
  const openPanel = async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data.notifications ?? []);

      /* فقط اگر واقعاً نخوانده داشت، mark-read بزن */
      if ((res.data.unread_count ?? 0) > 0) {
        await notificationAPI.markAllRead();
        setUnreadCount(0);
      }
    } catch {
      /* سایلنت */
    } finally {
      setLoading(false);
    }
  };

  const closePanel = () => setIsOpen(false);

  /* ── رنگ‌بندی دکمه ── */
  const btnBase =
    variant === 'light'
      ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
      : 'bg-panel/80 hover:bg-panel text-ink-3 hover:text-ink border-edge';

  return (
    <>
      {/* ── دکمه زنگوله ── */}
      <button
        onClick={openPanel}
        aria-label="اعلان‌ها"
        className={`relative p-2 rounded-xl backdrop-blur-md border shadow-lg
                    transition-all active:scale-95 flex items-center justify-center
                    ${btnBase} ${className}`}
      >
        <BellIcon className={iconSize} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                       bg-red-500 text-white text-[10px] font-black
                       rounded-full flex items-center justify-center px-1
                       shadow-md animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Overlay + پنل اعلان‌ها ── */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={closePanel}
        >
          <div
            ref={panelRef}
            className="fixed bottom-0 left-0 right-0 bg-bg rounded-t-3xl max-h-[80dvh] flex flex-col
                       shadow-2xl border-t border-edge animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{ direction: 'rtl', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* ── دستگیره کشیدن ── */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 bg-edge-2 rounded-full" />
            </div>

            {/* ── هدر پنل ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-edge shrink-0">
              <div className="flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-brand" />
                <h2 className="text-lg font-bold text-ink">اعلان‌ها</h2>
                {notifications.length > 0 && (
                  <span className="text-xs text-ink-4 bg-panel px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
              <button
                onClick={closePanel}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           bg-panel hover:bg-panel-hover text-ink-3 hover:text-ink
                           transition-all text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* ── لیست اعلان‌ها ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-3 border-brand border-t-transparent
                                  rounded-full animate-spin" />
                  <span className="text-ink-4 text-sm">در حال بارگذاری...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 bg-panel rounded-2xl flex items-center
                                  justify-center shadow-inner">
                    <BellIcon className="w-8 h-8 text-ink-4" />
                  </div>
                  <p className="text-ink-4 text-base font-medium">هیچ اعلانی وجود ندارد</p>
                  <p className="text-ink-4 text-sm">اعلان‌های جدید اینجا نمایش داده می‌شوند</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <NotificationCard key={notif.id} notif={notif} />
                ))
              )}
            </div>

            {/* ── پاورقی ── */}
            <div className="shrink-0 px-4 py-3 border-t border-edge">
              <p className="text-center text-xs text-ink-4">
                اعلان‌ها هر ۳۰ ثانیه یک‌بار بروزرسانی می‌شوند
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ──────────────────────────────── NotificationCard ──────────────────────────────── */
function NotificationCard({ notif }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = notif.body?.length > 120;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200
                  ${notif.is_read
                    ? 'bg-card border-edge'
                    : 'bg-gradient-to-br from-brand-2/10 to-brand/5 border-brand-2/30 shadow-sm'
                  }`}
    >
      {/* نشانگر نخوانده */}
      {!notif.is_read && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-semibold">جدید</span>
        </div>
      )}

      {/* عنوان */}
      <h3 className="font-bold text-ink text-base mb-1 leading-snug">
        {notif.title}
      </h3>

      {/* متن */}
      <p className={`text-sm text-ink-2 leading-relaxed whitespace-pre-wrap
                     ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {notif.body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-brand mt-1 font-semibold hover:underline"
        >
          {expanded ? 'کمتر نشان بده ↑' : 'بیشتر بخوان ↓'}
        </button>
      )}

      {/* زمان */}
      <div className="flex items-center gap-1 mt-3">
        <svg className="w-3.5 h-3.5 text-ink-4" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-ink-4">{timeAgo(notif.created_at)}</span>
      </div>
    </div>
  );
}
