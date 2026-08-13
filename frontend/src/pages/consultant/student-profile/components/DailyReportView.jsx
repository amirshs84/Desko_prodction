import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Card, EmptyState, PrimaryButton, formatSeconds } from '../../demo/components/DemoUi';
import { useStudentDailyReport } from '../../demo/hooks/useConsultantQueries';
import { PROFILE } from '../profileTheme';

export function formatIranTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tehran',
  });
}

export function formatIranDate(isoDate) {
  if (!isoDate) return '';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function DailyReportView({ userId, date, onBack, backLabel = 'بازگشت' }) {
  const { data, isLoading, isError, error, refetch } = useStudentDailyReport(userId, date);

  if (isLoading) return <EmptyState message="در حال بارگذاری گزارش روز…" />;
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-3">
          {error?.response?.data?.error?.message || 'خطا در دریافت گزارش روز'}
        </p>
        <PrimaryButton onClick={() => refetch()} style={{ background: PROFILE.brand }}>
          تلاش دوباره
        </PrimaryButton>
      </div>
    );
  }
  if (!data) return <EmptyState message="داده‌ای نیست" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold" style={{ color: PROFILE.brand }}>
            گزارش روزانه
          </p>
          <h2 className="text-lg font-bold mt-0.5" style={{ color: PROFILE.ink }}>
            {formatIranDate(data.date)}
          </h2>
          <p className="text-xs mt-1" style={{ color: PROFILE.inkMuted }}>
            {data.session_count} بازه مطالعه · {formatSeconds(data.total_seconds)}
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
            style={{ background: PROFILE.brandSoft, color: PROFILE.brandStrong }}
          >
            <ArrowRight size={14} />
            {backLabel}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-gray-500">جمع مطالعه</p>
          <p className="text-lg font-bold mt-1" style={{ color: PROFILE.brandStrong }}>
            {formatSeconds(data.total_seconds)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500">تعداد بازه</p>
          <p className="text-lg font-bold mt-1" style={{ color: PROFILE.ink }}>
            {data.session_count}
          </p>
        </Card>
      </div>

      {(data.subjects || []).length > 0 && (
        <Card>
          <h3 className="font-bold text-sm mb-3">تفکیک درس این روز</h3>
          <ul className="flex flex-col gap-2">
            {data.subjects.map((s) => (
              <li key={s.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <span className="text-sm flex-1">{s.name}</span>
                <span className="text-sm text-gray-600">{formatSeconds(s.total_seconds)}</span>
                <span className="text-xs text-gray-400">{s.percentage}٪</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-sm mb-4">تایم‌لاین فعالیت</h3>
        {(data.items || []).length === 0 ? (
          <p className="text-sm text-gray-400">در این روز جلسه‌ای ثبت نشده است.</p>
        ) : (
          <ol className="relative flex flex-col gap-0 pr-1">
            {data.items.map((item, index) => (
              <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center w-4 shrink-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-4 ring-white shrink-0"
                    style={{ background: item.color || PROFILE.brand }}
                  />
                  {index < data.items.length - 1 && (
                    <span className="w-0.5 flex-1 mt-1 rounded-full bg-gray-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0 rounded-2xl px-3 py-2.5" style={{ background: '#F8FAFC' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: PROFILE.ink }}>
                      {item.title}
                    </p>
                    <span className="text-xs font-semibold shrink-0" style={{ color: PROFILE.brandStrong }}>
                      {formatSeconds(item.duration_seconds)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {formatIranTime(item.start_time)}
                      {' – '}
                      {formatIranTime(item.end_time)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={12} />
                      مطالعه
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
