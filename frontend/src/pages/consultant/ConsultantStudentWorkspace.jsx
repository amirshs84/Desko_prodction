import { useLayoutEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EventsProvider } from '../../calendar/context/EventsContext';
import { SelectedDayProvider } from '../../calendar/context/SelectedDayContext';
import { UnifiedCalendar } from '../../calendar/UnifiedCalendar';
import { todayJalali } from '../../calendar/lib/jalaliUtils';
import { setCalendarBase, calPathWeek } from '../../calendar/lib/paths';
import { DEMO_FONT, PAGE_BG } from './demo/constants/theme';
import { Card, EmptyState, PrimaryButton, SecondaryButton, formatSeconds } from './demo/components/DemoUi';
import {
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

function pad(n) {
  return String(n).padStart(2, '0');
}

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
      className="h-screen w-full overflow-hidden flex flex-col"
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
          {student?.phone_number || ''}
          {student?.grade ? ` · پایه ${student.grade}` : ''}
        </p>
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
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
          <div className="flex-1 overflow-y-auto">
            <ProgressPane userId={numericId} />
          </div>
        )}
        {tab === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CalendarPane userId={numericId} />
          </div>
        )}
        {tab === 'snapshots' && (
          <div className="flex-1 overflow-y-auto">
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
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto flex flex-col gap-5">
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
    <div className="px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-4 h-full min-h-0">
      <div className="overflow-y-auto shrink-0">
        <BlockTemplatesPanel userId={userId} />
      </div>
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-gray-200">
        <EventsProvider ownerUserId={userId}>
          <SelectedDayProvider>
            <Routes>
              <Route path="calendar/*" element={<UnifiedCalendar />} />
              <Route path="*" element={<CalendarRedirect userId={userId} />} />
            </Routes>
          </SelectedDayProvider>
        </EventsProvider>
      </div>
    </div>
  );
}

function CalendarRedirect({ userId }) {
  const t = todayJalali();
  return <Navigate to={`/consultant/student/${userId}/calendar/week/${t.jy}/${t.jm}/${t.jd}`} replace />;
}

function BlockTemplatesPanel({ userId }) {
  const { data: templates = [] } = useBlockTemplates();
  const { placeBlock, moveBlock } = useCalendarBlockMutations(userId);
  const t = todayJalali();
  const [date, setDate] = useState(`${t.jy}-${pad(t.jm)}-${pad(t.jd)}`);
  const [startHour, setStartHour] = useState(14);
  const [templateKey, setTemplateKey] = useState('');
  const [toast, setToast] = useState('');
  const [moveClientId, setMoveClientId] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const onPlace = async () => {
    setError('');
    const key = templateKey || templates[0]?.key;
    if (!key) {
      setError('الگوی بلوک موجود نیست');
      return;
    }
    try {
      const result = await placeBlock.mutateAsync({
        date,
        template: key,
        start_minutes: startHour * 60,
        snap: true,
      });
      if (result.snapped) {
        showToast('اسلات شلوغ بود؛ بلوک به نزدیک‌ترین جای آزاد snap شد.');
      } else {
        showToast('بلوک با موفقیت گذاشته شد.');
      }
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'DAILY_CAPACITY_FULL') {
        setError('ظرفیت بیداری روز (۰۶–۲۳) پر است.');
      } else {
        setError(msg || 'خطا در گذاشتن بلوک');
      }
    }
  };

  const onMove = async () => {
    setError('');
    if (!moveClientId.trim()) {
      setError('شناسه رویداد (client_id) را وارد کنید');
      return;
    }
    try {
      const result = await moveBlock.mutateAsync({
        clientId: moveClientId.trim(),
        data: {
          date,
          start_minutes: startHour * 60,
          snap: true,
        },
      });
      if (result.snapped) {
        showToast('جابه‌جایی با snap انجام شد.');
      } else {
        showToast('جابه‌جایی انجام شد.');
      }
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'IMMUTABLE_EVENT_VIOLATION') {
        setError('رویداد ثابت قابل جابه‌جایی نیست.');
      } else if (code === 'DAILY_CAPACITY_FULL') {
        setError('ظرفیت بیداری روز پر است.');
      } else {
        setError(msg || 'خطا در جابه‌جایی');
      }
    }
  };

  return (
    <Card className="lg:w-72 shrink-0 flex flex-col gap-3 !p-4 h-fit">
      <h3 className="font-bold text-sm text-gray-900">بلوک‌های آماده</h3>
      <p className="text-[11px] text-gray-500">
        بیداری ۰۶–۲۳ · snap خودکار · رویدادهای قفل‌شده با 🔒
      </p>

      <label className="text-xs text-gray-500">
        تاریخ شمسی
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs text-gray-500">
        ساعت شروع
        <select
          value={startHour}
          onChange={(e) => setStartHour(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
            <option key={h} value={h}>{pad(h)}:00</option>
          ))}
        </select>
      </label>

      <label className="text-xs text-gray-500">
        الگو
        <select
          value={templateKey || templates[0]?.key || ''}
          onChange={(e) => setTemplateKey(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {templates.map((tpl) => (
            <option key={tpl.key} value={tpl.key}>
              {tpl.title} ({tpl.duration_minutes}د)
            </option>
          ))}
        </select>
      </label>

      <PrimaryButton onClick={onPlace} disabled={placeBlock.isPending}>
        {placeBlock.isPending ? '…' : 'گذاشتن بلوک'}
      </PrimaryButton>

      <div className="border-t border-gray-100 pt-3 mt-1">
        <p className="text-xs font-semibold text-gray-700 mb-2">جابه‌جایی با snap</p>
        <input
          value={moveClientId}
          onChange={(e) => setMoveClientId(e.target.value)}
          placeholder="client_id رویداد"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-2"
        />
        <SecondaryButton
          className="w-full"
          onClick={onMove}
          disabled={moveBlock.isPending}
        >
          جابه‌جایی
        </SecondaryButton>
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
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto flex flex-col gap-4">
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
