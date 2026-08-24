import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '../components/BottomNav';
import { examAPI } from '../api/client';
import { toFaDigits } from '../lib/persianDigits';

function fa(value) {
  return toFaDigits(String(value ?? ''));
}

const STATUS_LABEL = {
  SCHEDULED: 'زمان‌بندی‌شده',
  RUNNING: 'در حال برگزاری',
  COMPLETED: 'پایان یافته',
  CANCELLED: 'لغو شده',
};

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Exams() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student', 'exam-sessions'],
    queryFn: () => examAPI.getMySessions().then((r) => r.data),
    refetchInterval: 30_000,
  });
  const items = data?.items || [];
  const now = Date.now();
  const groups = useMemo(() => {
    const upcoming = [];
    const live = [];
    const done = [];
    for (const item of items) {
      const start = new Date(item.start_time).getTime();
      const end = new Date(item.end_time).getTime();
      if (item.status === 'CANCELLED' || item.status === 'COMPLETED' || end <= now) done.push(item);
      else if (item.status === 'RUNNING' || (start <= now && now < end)) live.push(item);
      else upcoming.push(item);
    }
    return { upcoming, live, done };
  }, [items, now]);

  return (
    <div className="h-full flex flex-col bg-page text-ink" dir="rtl">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-6 pb-nav-safe">
        <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black">آزمون‌ها</h1>
          <p className="text-sm text-ink-3 mt-1">دفترچه‌های زمان‌بندی‌شده و کارنامه شما</p>
        </div>

        {isLoading && <p className="text-sm text-ink-3">در حال بارگذاری…</p>}
        {isError && <p className="text-sm text-rose-400">دریافت آزمون‌ها ناموفق بود.</p>}

        <Section title="در حال برگزاری" items={groups.live} empty="آزمون زنده‌ای ندارید" action={(item) => (
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-black"
            onClick={() => navigate(`/exams/${item.id}/take`)}
          >
            ورود به آزمون
          </button>
        )} />

        <Section title="آزمون‌های پیش‌رو" items={groups.upcoming} empty="آزمون آینده‌ای ثبت نشده" />

        <Section title="تمام‌شده" items={groups.done} empty="کارنامه‌ای نیست" action={(item) => (
          item.attempt_id && item.attempt_status === 'FINISHED' ? (
            <Link
              to={`/exam-results/${item.attempt_id}`}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-panel text-ink"
            >
              کارنامه
            </Link>
          ) : (
            <span className="text-xs text-ink-3">در انتظار نتیجه</span>
          )
        )} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Section({ title, items, empty, action }) {
  return (
    <section className="space-y-3">
      <h2 className="font-bold text-sm text-ink-2">{title}</h2>
      {!items.length && (
        <div className="rounded-3xl bg-panel p-5 text-sm text-ink-3">{empty}</div>
      )}
      {items.map((item) => (
        <div key={item.id} className="rounded-3xl bg-panel p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold truncate">{item.title}</p>
            <p className="text-xs text-ink-3 mt-1">{item.exam_title}</p>
            <p className="text-[11px] text-ink-3 mt-2">
              {formatWhen(item.start_time)} · {STATUS_LABEL[item.status] || item.status} · {fa(item.problems_count)} سوال
            </p>
          </div>
          {action ? action(item) : null}
        </div>
      ))}
    </section>
  );
}
