import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { useQueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';
import { X } from 'lucide-react';
import { EventsProvider } from '../../../../../calendar/context/EventsContext';
import { SelectedDayProvider } from '../../../../../calendar/context/SelectedDayContext';
import { UnifiedCalendar } from '../../../../../calendar/UnifiedCalendar';
import { todayJalali } from '../../../../../calendar/lib/jalaliUtils';
import { setCalendarBase } from '../../../../../calendar/lib/paths';
import { planningAPI } from '../../../../../api/client';
import { STUDIO } from './studioTheme';

/** پایهٔ ایزوله داخل MemoryRouter — به BrowserRouter اپ نشت نمی‌کند. */
const PREVIEW_BASE = '/__plan_preview__';

function blocksToDraftEvents(blocks = []) {
  return blocks.map((b, index) => ({
    id: `draft:${b.jy}-${b.jm}-${b.jd}-${b.start_minutes}-${index}`,
    jy: b.jy,
    jm: b.jm,
    jd: b.jd,
    title: b.subject || 'بلوک پیشنهادی',
    description: 'پیش‌نویس برنامه‌ریزی گروهی — هنوز ذخیره نشده',
    startMinutes: b.start_minutes,
    endMinutes: b.end_minutes ?? b.start_minutes + (b.duration_minutes || 90),
    color: b.color || '#10b981',
    allDay: false,
    createdAt: new Date().toISOString(),
    origin: 'plan_preview',
    kind: 'mutable',
  }));
}

function draftEventsToBlocks(events = []) {
  return events
    .filter((e) => e.id?.startsWith('draft:') || e.origin === 'plan_preview')
    .map((e) => ({
      jy: e.jy,
      jm: e.jm,
      jd: e.jd,
      start_minutes: e.startMinutes,
      end_minutes: e.endMinutes,
      subject: e.title,
      color: e.color || '#10b981',
    }));
}

function PreviewCalendarTree({
  student,
  draftSeed,
  onDraftEventsChange,
  startPath,
}) {
  const router = useMemo(
    () =>
      createMemoryRouter(
        [
          {
            path: `${PREVIEW_BASE}/*`,
            element: <UnifiedCalendar />,
          },
          {
            path: '*',
            element: <Navigate to={startPath} replace />,
          },
        ],
        { initialEntries: [startPath] },
      ),
    [startPath],
  );

  return (
    <EventsProvider
      ownerUserId={student.student_id}
      previewMode
      draftSeed={draftSeed}
      onDraftEventsChange={onDraftEventsChange}
    >
      <SelectedDayProvider>
        <RouterProvider router={router} />
      </SelectedDayProvider>
    </EventsProvider>
  );
}

/**
 * مودال تقویم پیش‌نمایش.
 * تقویم در یک React root جدا سوار می‌شود تا Router حافظه‌ای با
 * BrowserRouter صفحهٔ مشاور تداخل نداشته باشد (علت صفحهٔ سیاه قبلی).
 */
export function PreviewCalendarModal({ student, windowStart, onClose, onCommitted }) {
  const queryClient = useQueryClient();
  const hostRef = useRef(null);
  const rootRef = useRef(null);
  const draftSeed = useMemo(
    () => blocksToDraftEvents(student?.blocks || []),
    [student],
  );
  const draftsRef = useRef(draftSeed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onDraftEventsChange = useCallback((drafts) => {
    draftsRef.current = drafts;
  }, []);

  const t = windowStart
    ? { jy: windowStart.jy, jm: windowStart.jm, jd: windowStart.jd }
    : todayJalali();
  const startPath = `${PREVIEW_BASE}/week/${t.jy}/${t.jm}/${t.jd}`;

  useLayoutEffect(() => {
    setCalendarBase(PREVIEW_BASE);
    return () => setCalendarBase('/calendar');
  }, []);

  useEffect(() => {
    draftsRef.current = draftSeed;
  }, [draftSeed]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    if (!rootRef.current) {
      rootRef.current = createRoot(host);
    }

    rootRef.current.render(
      <QueryClientProvider client={queryClient}>
        <PreviewCalendarTree
          student={student}
          draftSeed={draftSeed}
          onDraftEventsChange={onDraftEventsChange}
          startPath={startPath}
        />
      </QueryClientProvider>,
    );

    return () => {
      // unmount در effect جدا تا StrictMode دوبار mount را تحمل کند
    };
  }, [queryClient, student, draftSeed, onDraftEventsChange, startPath]);

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, []);

  const commit = async () => {
    setSaving(true);
    setError('');
    try {
      const blocks = draftEventsToBlocks(draftsRef.current);
      if (!blocks.length) {
        setError('هیچ بلوک پیشنهادی برای ثبت نیست.');
        setSaving(false);
        return;
      }
      await planningAPI.applyStudentBlocks(student.student_id, {
        blocks,
        take_snapshot: true,
      });
      onCommitted(student.student_id, blocks);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ثبت تغییرات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(15,23,42,0.5)' }}
    >
      <div
        className="m-2 md:m-4 flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col border shadow-2xl"
        style={{ background: '#fff', borderColor: STUDIO.border }}
      >
        <header
          className="shrink-0 px-4 py-3 border-b flex flex-wrap items-center gap-3 justify-between"
          style={{ borderColor: STUDIO.border }}
        >
          <div className="min-w-0">
            <h3 className="font-bold text-sm md:text-base" style={{ color: STUDIO.ink }}>
              پیش‌نمایش تقویم — {student.student_name || student.student_id}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: STUDIO.muted }}>
              بلوک‌های سبز، پیشنهاد برنامه‌ی گروهی‌اند. ویرایش کنید؛ با «ثبت تغییرات» روی تقویم فرد
              ذخیره می‌شود و از این بچ خارج می‌گردد.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={commit}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: STUDIO.brand }}
            >
              {saving ? 'در حال ثبت…' : 'ثبت تغییرات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600"
              aria-label="بستن"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className="px-4 py-2 text-sm text-red-600 bg-red-50 shrink-0">{error}</div>
        )}

        <div ref={hostRef} className="flex-1 min-h-0 overflow-hidden" />
      </div>
    </div>
  );
}
