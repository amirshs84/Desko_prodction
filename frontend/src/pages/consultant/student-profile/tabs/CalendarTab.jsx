import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EventsProvider } from '../../../../calendar/context/EventsContext';
import { SelectedDayProvider } from '../../../../calendar/context/SelectedDayContext';
import { UnifiedCalendar } from '../../../../calendar/UnifiedCalendar';
import { todayJalali } from '../../../../calendar/lib/jalaliUtils';
import { EVENT_COLORS } from '../../../../calendar/lib/eventColors';
import { encodeTemplateDrag, TEMPLATE_DRAG_MIME } from '../../../../calendar/lib/dragMime';
import { Card, EmptyState, PrimaryButton } from '../../demo/components/DemoUi';
import {
  useBlockTemplateMutations,
  useBlockTemplates,
  useCalendarBlockMutations,
  useStudentSnapshots,
} from '../../demo/hooks/useConsultantQueries';
import { PROFILE } from '../profileTheme';

export function CalendarTab({ userId }) {
  const [showSnapshots, setShowSnapshots] = useState(false);

  return (
    <EventsProvider ownerUserId={userId}>
      <SelectedDayProvider>
        <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4 px-4 md:px-6 py-4 overflow-y-auto lg:overflow-hidden overscroll-contain">
          <div className="order-2 lg:order-1 shrink-0 lg:h-full lg:overflow-y-auto lg:max-h-full lg:w-80 pb-6 lg:pb-0 flex flex-col gap-3">
            <BlockTemplatesPanel />
            <button
              type="button"
              onClick={() => setShowSnapshots((v) => !v)}
              className="text-xs font-semibold px-3 py-2 rounded-xl text-right"
              style={{ background: PROFILE.brandSoft, color: PROFILE.brandStrong }}
            >
              {showSnapshots ? 'بستن نسخه‌های تقویم' : 'نسخه‌های تقویم'}
            </button>
            {showSnapshots && <SnapshotsPanel userId={userId} />}
          </div>
          <div
            className="order-1 lg:order-2 h-[70vh] min-h-[70vh] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink
                       rounded-2xl overflow-hidden border"
            style={{ borderColor: PROFILE.border }}
          >
            <Routes>
              <Route path="calendar/*" element={<UnifiedCalendar />} />
              <Route path="*" element={<CalendarRedirect userId={userId} />} />
            </Routes>
          </div>
        </div>
      </SelectedDayProvider>
    </EventsProvider>
  );
}

function CalendarRedirect({ userId }) {
  const t = todayJalali();
  return (
    <Navigate
      to={`/consultant/student/${userId}/calendar/week/${t.jy}/${t.jm}/${t.jd}`}
      replace
    />
  );
}

function BlockTemplatesPanel() {
  const { data: templates = [], isLoading } = useBlockTemplates();
  const { createTemplate, deleteTemplate } = useBlockTemplateMutations();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(90);
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      `${t.title} ${t.duration_minutes}`.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createTemplate.mutateAsync({
        title: title.trim(),
        duration_minutes: Number(duration),
        color,
      });
      setTitle('');
      setDuration(90);
      setShowCreate(false);
      showToast('بلوک آماده ذخیره شد.');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ذخیره بلوک');
    }
  };

  const onDelete = async (key, name) => {
    if (!window.confirm(`بلوک «${name}» حذف شود؟`)) return;
    try {
      await deleteTemplate.mutateAsync(key);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در حذف');
    }
  };

  return (
    <Card className="w-full shrink-0 flex flex-col gap-3 !p-4">
      <div>
        <h3 className="font-bold text-sm text-gray-900">بلوک‌های آماده</h3>
        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
          بلوک را از اینجا بکشید و روی ساعت تقویم رها کنید.
          رویدادهای روی تقویم را هم می‌توانید بکشید و جابه‌جا کنید.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جست‌وجوی بلوک…"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />

      <PrimaryButton
        type="button"
        className="!py-2 !bg-emerald-600"
        style={{ background: PROFILE.brand }}
        onClick={() => setShowCreate((v) => !v)}
      >
        {showCreate ? 'بستن فرم' : '+ ساخت بلوک جدید'}
      </PrimaryButton>

      {showCreate && (
        <form onSubmit={onCreate} className="flex flex-col gap-2 border border-gray-100 rounded-xl p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (مثلاً زیست)"
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <label className="text-xs text-gray-500">
            مدت (دقیقه)
            <input
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_COLORS.slice(0, 8).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2"
                style={{
                  background: c,
                  borderColor: color === c ? PROFILE.brand : 'transparent',
                }}
                aria-label={`رنگ ${c}`}
              />
            ))}
          </div>
          <PrimaryButton
            type="submit"
            disabled={createTemplate.isPending || !title.trim()}
            style={{ background: PROFILE.brand }}
          >
            {createTemplate.isPending ? '…' : 'ذخیره تغییرات'}
          </PrimaryButton>
        </form>
      )}

      <div className="flex flex-col gap-2 max-h-[36vh] lg:max-h-[min(50vh,100%)] overflow-y-auto">
        {isLoading && <p className="text-xs text-gray-400">در حال بارگذاری…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-xs text-gray-400">بلوکی پیدا نشد</p>
        )}
        {filtered.map((tpl) => (
          <div
            key={tpl.key}
            draggable
            onDragStart={(e) => {
              const tplPayload = {
                key: tpl.key,
                title: tpl.title,
                duration_minutes: tpl.duration_minutes,
                color: tpl.color,
              };
              e.dataTransfer.setData(TEMPLATE_DRAG_MIME, JSON.stringify(tplPayload));
              e.dataTransfer.setData('text/plain', encodeTemplateDrag(tplPayload));
              e.dataTransfer.effectAllowed = 'copy';
              const ghost = document.createElement('div');
              ghost.textContent = `${tpl.title} · ${tpl.duration_minutes}د`;
              ghost.style.cssText = [
                'position:fixed',
                'top:-200px',
                'left:-200px',
                'padding:8px 12px',
                'border-radius:10px',
                'background:#064e3b',
                'color:#ecfdf5',
                'font:600 13px Vazirmatn,Tahoma,sans-serif',
                'border:1px solid #065f46',
                'box-shadow:0 8px 24px rgba(0,0,0,.35)',
                'pointer-events:none',
                'z-index:99999',
              ].join(';');
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, 16, 16);
              window.setTimeout(() => ghost.remove(), 0);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2
                       cursor-grab active:cursor-grabbing hover:border-emerald-300"
            title="بکشید و روی تقویم رها کنید"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: tpl.color || PROFILE.brand }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{tpl.title}</p>
              <p className="text-[11px] text-gray-500">
                {tpl.duration_minutes} دقیقه
                {tpl.editable ? ' · مال شما' : ' · پیش‌فرض'}
              </p>
            </div>
            {tpl.editable && (
              <button
                type="button"
                onClick={() => onDelete(tpl.key, tpl.title)}
                className="text-[11px] text-red-500 hover:text-red-700 px-1"
              >
                حذف
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {toast && (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">{toast}</p>
      )}
    </Card>
  );
}

function SnapshotsPanel({ userId }) {
  const { data: snapshots = [], isLoading, refetch } = useStudentSnapshots(userId);
  const { restoreSnapshot } = useCalendarBlockMutations(userId);
  const [msg, setMsg] = useState('');

  const onRestore = async (id) => {
    if (!window.confirm('تقویم به این نسخه برگردد؟ رویدادهای mutable جایگزین می‌شوند؛ ثابت‌ها می‌مانند.')) {
      return;
    }
    setMsg('');
    try {
      await restoreSnapshot.mutateAsync(id);
      setMsg('بازگردانی انجام شد.');
      refetch();
    } catch (err) {
      setMsg(err?.response?.data?.error?.message || 'خطا در بازگردانی');
    }
  };

  return (
    <Card className="!p-3">
      <h4 className="text-xs font-bold text-gray-900 mb-2">نسخه‌های ذخیره‌شده</h4>
      {msg && <p className="text-xs text-emerald-700 mb-2">{msg}</p>}
      {isLoading && <EmptyState message="در حال بارگذاری…" />}
      {!isLoading && snapshots.length === 0 && (
        <p className="text-xs text-gray-400 py-2">نسخه‌ای ثبت نشده است</p>
      )}
      <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {snapshots.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                #{s.id}{s.reason ? ` · ${s.reason}` : ''}
              </p>
              <p className="text-gray-400">
                {s.event_count} رویداد
                {s.taken_at ? ` · ${new Date(s.taken_at).toLocaleString('fa-IR')}` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={restoreSnapshot.isPending}
              onClick={() => onRestore(s.id)}
              className="shrink-0 px-2 py-1 rounded-lg font-semibold text-white"
              style={{ background: PROFILE.brand }}
            >
              بازگردانی
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
