import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { on, NotifyEvents } from '../lib/eventBus';
import { trackingRef } from '../lib/normalize';
import { track } from '../lib/trackingQueue';
import { dismiss, performAction } from './NotificationActions';

const Lottie = lazy(() => import('lottie-react'));

function LottieFromUrl({ url }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => alive && setData(json))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  if (!data) return <div className="h-40" />;
  return (
    <Suspense fallback={<div className="h-40" />}>
      <Lottie animationData={data} loop className="h-40 mx-auto" />
    </Suspense>
  );
}

const LAYOUTS = {
  MODAL: {
    wrap: 'items-center justify-center p-6',
    card: 'w-full max-w-sm rounded-3xl',
    motion: { initial: { scale: 0.85, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 } },
  },
  BOTTOM_SHEET: {
    wrap: 'items-end justify-center',
    card: 'w-full max-w-lg rounded-t-3xl pb-[env(safe-area-inset-bottom)]',
    motion: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
  },
  FULLSCREEN: {
    wrap: 'items-stretch justify-stretch',
    card: 'w-full h-full flex flex-col justify-center',
    motion: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  },
  BANNER: {
    wrap: 'items-start justify-center p-3 pt-[calc(env(safe-area-inset-top)+12px)]',
    card: 'w-full max-w-md rounded-2xl',
    motion: { initial: { y: -60, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -60, opacity: 0 } },
  },
};

/** پیام داخل اپ: مودال / شیت / تمام‌صفحه / بنر، با انیمیشن Lottie یا تصویر. */
export default function InAppMessageHost() {
  const [queue, setQueue] = useState([]);
  const current = queue[0];

  useEffect(
    () =>
      on(NotifyEvents.IN_APP, (n) =>
        setQueue((q) => (q.some((x) => x.id && x.id === n.id) ? q : [...q, n])),
      ),
    [],
  );

  useEffect(() => {
    if (current) track('DISPLAYED', trackingRef(current), { metadata: { surface: 'in_app' } });
  }, [current]);

  const next = () => setQueue((q) => q.slice(1));
  const spec = current?.inApp || {};
  const layout = LAYOUTS[spec.layout] || LAYOUTS.MODAL;
  const dismissible = spec.dismissible !== false;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id || current.title}
          className={`fixed inset-0 z-[1100] flex bg-black/50 ${layout.wrap}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!dismissible) return;
            dismiss(current);
            next();
          }}
          dir="rtl"
        >
          <motion.div
            {...layout.motion}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`bg-panel text-ink border border-edge shadow-2xl p-6 text-center ${layout.card}`}
            style={spec.background_color ? { background: spec.background_color } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {current.media.lottieUrl ? (
              <LottieFromUrl url={current.media.lottieUrl} />
            ) : (
              current.media.imageUrl && (
                <img src={current.media.imageUrl} alt="" className="w-full max-h-48 object-contain rounded-2xl mb-2" />
              )
            )}
            <h3 className="text-lg font-bold mt-3">{current.title}</h3>
            {current.body && <p className="text-sm text-ink-2 mt-2 leading-7 whitespace-pre-line">{current.body}</p>}

            <div className="mt-5 flex flex-col gap-2">
              {(current.actions.length ? current.actions : [{ id: 'ok', title: 'باشه', type: 'DISMISS' }]).map(
                (a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    className={
                      i === 0
                        ? 'w-full py-3 rounded-2xl bg-brand text-white font-semibold active:scale-[0.98]'
                        : 'w-full py-3 rounded-2xl bg-panel-hover text-ink-2 font-medium active:scale-[0.98]'
                    }
                    onClick={() => {
                      if (a.type === 'DISMISS' && a.id === 'ok') dismiss(current);
                      else performAction(current, a);
                      next();
                    }}
                  >
                    {a.title}
                  </button>
                ),
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
