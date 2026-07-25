import { useLayoutEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EventsProvider } from '../../calendar/context/EventsContext';
import { SelectedDayProvider } from '../../calendar/context/SelectedDayContext';
import { UnifiedCalendar } from '../../calendar/UnifiedCalendar';
import { todayJalali } from '../../calendar/lib/jalaliUtils';
import { setCalendarBase, calPathWeek } from '../../calendar/lib/paths';
import { DEMO_FONT, PAGE_BG } from './demo/constants/theme';
import { Card, EmptyState, PrimaryButton, formatSeconds } from './demo/components/DemoUi';
import { EVENT_COLORS } from '../../calendar/lib/eventColors';
import { encodeTemplateDrag, TEMPLATE_DRAG_MIME } from '../../calendar/lib/dragMime';
import {
  useBlockTemplateMutations,
  useBlockTemplates,
  useCalendarBlockMutations,
  useConsultantStudents,
  useStudentProgress,
  useStudentSnapshots,
} from './demo/hooks/useConsultantQueries';

const TABS = [
  { id: 'progress', label: 'پیشرفت' },
  { id: 'calendar', label: 'تقویم' },
  { id: 'snapshots', label: 'نسخه‌ها' },
];

function resolveTab(pathname, userId) {
  const base = `/consultant/student/${userId}`;
  if (pathname.startsWith(`${base}/calendar`)) return 'calendar';
  if (pathname.startsWith(`${base}/snapshots`)) return 'snapshots';
  return 'progress';
}

export default function ConsultantStudentWorkspace() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const numericId = Number(userId);
  const tab = resolveTab(location.pathname, userId);

  const { data: students = [] } = useConsultantStudents();
  const student = useMemo(
    () => students.find((s) => s.user_id === numericId),
    [students, numericId],
  );

  const goTab = (id) => {
    const base = `/consultant/student/${userId}`;
    if (id === 'calendar') {
      setCalendarBase(`${base}/calendar`);
      const t = todayJalali();
      navigate(calPathWeek(t.jy, t.jm, t.jd));
      return;
    }
    if (id === 'snapshots') {
      navigate(`${base}/snapshots`);
      return;
    }
    navigate(base);
  };

  useLayoutEffect(() => {
    setCalendarBase(`/consultant/student/${userId}/calendar`);
    return () => setCalendarBase('/calendar');
  }, [userId]);

  return (
    <div
      dir="rtl"
      className="h-dvh w-full overflow-hidden flex flex-col"
      style={{ fontFamily: DEMO_FONT, background: PAGE_BG }}
    >
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 md:px-8 py-4">
        <button
          type="button"
          onClick={() => navigate('/consultant')}
          className="inline-flex items-center gap-2 text-sm text-sky-700 hover:text-sky-800 mb-3"
        >
          <ArrowRight size={16} /> بازگشت به پنل مشاور
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {student?.full_name || `دانش‌آموز #${userId}`}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          <span dir="ltr" className="inline-block">{student?.phone_number || '—'}</span>
          {student?.grade ? ` · پایه ${student.grade}` : ''}
        </p>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
              style={{
                background: tab === t.id ? '#E0F2FE' : '#F3F4F6',
                color: tab === t.id ? '#0284C7' : '#6B7280',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {tab === 'progress' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <ProgressPane userId={numericId} />
          </div>
        )}
        {tab === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CalendarPane userId={numericId} />
          </div>
        )}
        {tab === 'snapshots' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <SnapshotsPane userId={numericId} />
          </div>
        )}
      </main>
    </div>
  );
}

function ProgressPane({ userId }) {
  const { data: profile, isLoading, isError, error, refetch } = useStudentProgress(userId);
  const [period, setPeriod] = useState('daily');

  if (isLoading) return <EmptyState message="در حال بارگذاری پیشرفت…" />;
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-3">
          {error?.response?.data?.error?.message || 'خطا در دریافت پیشرفت'}
        </p>
        <PrimaryButton onClick={() => refetch()}>تلاش دوباره</PrimaryButton>
      </div>
    );
  }
  if (!profile) return <EmptyState message="داده‌ای نیست" />;

  const total =
    period === 'daily' ? profile.today : period === 'weekly' ? profile.week : profile.month;
  const breakdownKey = period === 'daily' ? 'today' : period === 'weekly' ? 'week' : 'month';
  const breakdown = profile.subjects_by_period?.[breakdownKey] || profile.subjects_breakdown || [];
  const heatmap = profile.heatmap || [];

  const getHeatColor = (seconds) => {
    if (!seconds) return '#E5E7EB';
    if (seconds < 1800) return '#A7F3D0';
    if (seconds < 3600) return '#6EE7B7';
    if (seconds < 7200) return '#34D399';
    if (seconds < 14400) return '#10B981';
    return '#059669';
  };

  return (
    <div className="px-4 md:px-8 py-6 pb-10 max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex gap-2">
        {[
          ['daily', 'روزانه'],
          ['weekly', 'هفتگی'],
          ['monthly', 'ماهانه'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: period === id ? '#0EA5E9' : '#F3F4F6',
              color: period === id ? '#fff' : '#6B7280',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-gray-500">امروز</p>
          <p className="text-lg font-bold mt-1">{formatSeconds(profile.today)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">هفته</p>
          <p className="text-lg font-bold mt-1">{formatSeconds(profile.week)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">ماه</p>
          <p className="text-lg font-bold mt-1">{formatSeconds(profile.month)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-sm mb-2">جمع بازه انتخابی</h3>
        <p className="text-2xl font-bold text-sky-700">{formatSeconds(total)}</p>
        <p className="text-xs text-gray-500 mt-1">{profile.total_sessions} جلسه ثبت‌شده</p>
      </Card>

      <Card>
        <h3 className="font-bold text-sm mb-3">تفکیک درس</h3>
        {breakdown.length === 0 ? (
          <p className="text-sm text-gray-400">بدون مطالعه در این بازه</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {breakdown.map((s) => (
              <li key={s.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: s.color || '#0EA5E9' }}
                />
                <span className="text-sm flex-1">{s.name}</span>
                <span className="text-sm text-gray-600">{formatSeconds(s.total_seconds)}</span>
                <span className="text-xs text-gray-400">{s.percentage}٪</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-bold text-sm mb-3">نقشه حرارتی</h3>
        <div className="flex flex-wrap gap-1">
          {heatmap.slice(-60).map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${formatSeconds(d.total_seconds)}`}
              className="w-3.5 h-3.5 rounded-sm"
              style={{ background: getHeatColor(d.total_seconds) }}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-sm mb-3">جلسات اخیر</h3>
        {(profile.recent_sessions || []).length === 0 ? (
          <p className="text-sm text-gray-400">جلسه‌ای نیست</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {profile.recent_sessions.slice(0, 12).map((s) => (
              <li key={s.id} className="py-2.5 flex justify-between gap-3 text-sm">
                <span>{s.subject || 'بدون درس'}</span>
                <span className="text-gray-500">{formatSeconds(s.duration_seconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CalendarPane({ userId }) {
  return (
    <EventsProvider ownerUserId={userId}>
      <SelectedDayProvider>
        <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4 px-4 md:px-6 py-4 overflow-y-auto lg:overflow-hidden overscroll-contain">
          <div className="order-2 lg:order-1 shrink-0 lg:h-full lg:overflow-y-auto lg:max-h-full lg:w-80 pb-6 lg:pb-0">
            <BlockTemplatesPanel />
          </div>
          <div className="order-1 lg:order-2 h-[70vh] min-h-[70vh] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink rounded-2xl overflow-hidden border border-gray-200">
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
  return <Navigate to={`/consultant/student/${userId}/calendar/week/${t.jy}/${t.jm}/${t.jd}`} replace />;
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
        className="!py-2"
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
                  borderColor: color === c ? '#0284C7' : 'transparent',
                }}
                aria-label={`رنگ ${c}`}
              />
            ))}
          </div>
          <PrimaryButton type="submit" disabled={createTemplate.isPending || !title.trim()}>
            {createTemplate.isPending ? '…' : 'ذخیره'}
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
              // تصویر درگ بدون هاله سفید کارت روشن
              const ghost = document.createElement('div');
              ghost.textContent = `${tpl.title} · ${tpl.duration_minutes}د`;
              ghost.style.cssText = [
                'position:fixed',
                'top:-200px',
                'left:-200px',
                'padding:8px 12px',
                'border-radius:10px',
                'background:#0f172a',
                'color:#e2e8f0',
                'font:600 13px Vazirmatn,Tahoma,sans-serif',
                'border:1px solid #334155',
                'box-shadow:0 8px 24px rgba(0,0,0,.45)',
                'pointer-events:none',
                'z-index:99999',
              ].join(';');
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, 16, 16);
              window.setTimeout(() => ghost.remove(), 0);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-sky-300"
            title="بکشید و روی تقویم رها کنید"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: tpl.color || '#10b981' }}
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

function SnapshotsPane({ userId }) {
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
    <div className="px-4 md:px-8 py-6 pb-10 max-w-3xl mx-auto flex flex-col gap-4">
      <Card>
        <h3 className="font-bold text-sm text-gray-900 mb-2">نسخه‌های تقویم</h3>
        <p className="text-xs text-gray-500">
          اسنپ‌شات فقط بعد از Publish/پذیرش گرفته می‌شود؛ حداکثر ۱۰ نسخه نگه داشته می‌شود.
        </p>
      </Card>

      {msg && (
        <div className="rounded-xl bg-sky-50 text-sky-800 text-sm px-4 py-3">{msg}</div>
      )}

      <Card className="!p-0 overflow-hidden">
        {isLoading && <EmptyState message="در حال بارگذاری…" />}
        {!isLoading && snapshots.length === 0 && (
          <EmptyState message="نسخه‌ای ثبت نشده است" />
        )}
        <ul className="divide-y divide-gray-50">
          {snapshots.map((s) => (
            <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  نسخه #{s.id}
                  {s.reason ? ` · ${s.reason}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {s.event_count} رویداد
                  {s.taken_at
                    ? ` · ${new Date(s.taken_at).toLocaleString('fa-IR')}`
                    : ''}
                  {s.plan_run_id ? ` · اجرا ${s.plan_run_id}` : ''}
                </p>
              </div>
              <PrimaryButton
                className="!py-1.5 !px-3 !text-xs"
                disabled={restoreSnapshot.isPending}
                onClick={() => onRestore(s.id)}
              >
                بازگردانی
              </PrimaryButton>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
