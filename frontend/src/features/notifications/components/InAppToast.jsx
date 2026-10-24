import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { on, NotifyEvents } from '../lib/eventBus';
import { trackingRef } from '../lib/normalize';
import { track } from '../lib/trackingQueue';
import { dismiss, performAction } from './NotificationActions';

const AUTO_HIDE_MS = { CRITICAL: 0, HIGH: 7000, NORMAL: 5000, LOW: 4000 };
const ACCENT = {
  CRITICAL: 'border-red-500/60',
  HIGH: 'border-brand/60',
  NORMAL: 'border-edge',
  LOW: 'border-edge',
};

/** بنر بالای صفحه برای نوتیفی که وقتی اپ باز است می‌رسد (به‌جای نوتیف سیستمی). */
export default function InAppToast() {
  const [queue, setQueue] = useState([]);
  const timer = useRef(null);
  const current = queue[0];

  useEffect(() => on(NotifyEvents.RECEIVED, (n) => setQueue((q) => [...q, n].slice(-5))), []);

  useEffect(() => {
    if (!current) return undefined;
    track('DISPLAYED', trackingRef(current), { metadata: { surface: 'toast' } });
    const ms = AUTO_HIDE_MS[current.priority] ?? 5000;
    if (ms) timer.current = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(timer.current);
  }, [current]);

  const close = (fn) => {
    clearTimeout(timer.current);
    fn?.();
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[1000] flex justify-center px-3 pointer-events-none"
         style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }} dir="rtl">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id || current.title}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`pointer-events-auto w-full max-w-md rounded-2xl border bg-panel/95 backdrop-blur
                        shadow-xl text-ink ${ACCENT[current.priority] || 'border-edge'}`}
          >
            <button type="button" className="w-full text-right flex gap-3 p-3"
                    onClick={() => close(() => performAction(current))}>
              {current.media.largeIconUrl && (
                <img src={current.media.largeIconUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{current.title}</p>
                {current.body && <p className="text-xs text-ink-2 line-clamp-2 mt-0.5">{current.body}</p>}
              </div>
            </button>
            {current.media.imageUrl && current.style === 'BIG_PICTURE' && (
              <img src={current.media.imageUrl} alt="" className="w-full max-h-40 object-cover px-3 pb-2 rounded-xl" />
            )}
            {current.actions.length > 0 && (
              <div className="flex border-t border-edge">
                {current.actions.map((a) => (
                  <button key={a.id} type="button"
                          className="flex-1 py-2 text-xs font-semibold text-brand hover:bg-panel-hover"
                          onClick={() => close(() =>
                            (a.type === 'DISMISS' ? dismiss(current) : performAction(current, a)))}>
                    {a.title}
                  </button>
                ))}
              </div>
            )}
            {!AUTO_HIDE_MS[current.priority] && current.actions.length === 0 && (
              <button type="button" className="w-full py-2 text-xs text-ink-4 border-t border-edge"
                      onClick={() => close(() => dismiss(current))}>
                بستن
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
