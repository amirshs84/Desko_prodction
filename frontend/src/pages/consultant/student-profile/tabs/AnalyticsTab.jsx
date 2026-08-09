import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, EmptyState, PrimaryButton, formatSeconds } from '../../demo/components/DemoUi';
import { useStudentProgress } from '../../demo/hooks/useConsultantQueries';
import { StudyHeatmap } from '../components/StudyHeatmap';
import { PROFILE } from '../profileTheme';

const PERIODS = [
  ['daily', 'روزانه'],
  ['weekly', 'هفتگی'],
  ['monthly', 'ماهانه'],
];

const CHART_COLORS = ['#059669', '#34D399', '#6EE7B7', '#A7F3D0', '#10B981', '#047857'];

export function AnalyticsTab({ userId }) {
  const { data: profile, isLoading, isError, error, refetch } = useStudentProgress(userId);
  const [period, setPeriod] = useState('daily');

  const breakdownKey = period === 'daily' ? 'today' : period === 'weekly' ? 'week' : 'month';
  const breakdown = profile?.subjects_by_period?.[breakdownKey] || profile?.subjects_breakdown || [];
  const total =
    period === 'daily' ? profile?.today : period === 'weekly' ? profile?.week : profile?.month;

  const trendData = useMemo(() => buildTrend(profile?.heatmap || [], period), [profile, period]);

  if (isLoading) return <EmptyState message="در حال بارگذاری گزارش‌ها…" />;
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-3">
          {error?.response?.data?.error?.message || 'خطا در دریافت گزارش'}
        </p>
        <PrimaryButton onClick={() => refetch()} style={{ background: PROFILE.brand }}>
          تلاش دوباره
        </PrimaryButton>
      </div>
    );
  }
  if (!profile) return <EmptyState message="داده‌ای نیست" />;

  return (
    <div className="px-4 md:px-8 py-6 pb-10 max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex gap-2">
        {PERIODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: period === id ? PROFILE.brand : '#F3F4F6',
              color: period === id ? '#fff' : '#6B7280',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="امروز" value={formatSeconds(profile.today)} />
        <StatCard title="هفته" value={formatSeconds(profile.week)} />
        <StatCard title="ماه" value={formatSeconds(profile.month)} />
      </div>

      <Card>
        <h3 className="font-bold text-sm mb-1">جمع بازه انتخابی</h3>
        <p className="text-2xl font-bold" style={{ color: PROFILE.brandStrong }}>
          {formatSeconds(total)}
        </p>
        <p className="text-xs text-gray-500 mt-1">{profile.total_sessions} جلسه ثبت‌شده</p>
      </Card>

      <Card>
        <h3 className="font-bold text-sm mb-3">روند مطالعه</h3>
        {trendData.length === 0 ? (
          <p className="text-sm text-gray-400">داده‌ای برای نمودار نیست</p>
        ) : (
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v) => `${v}د`}
                  width={36}
                />
                <Tooltip
                  formatter={(v) => [`${v} دقیقه`, 'مطالعه']}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#studyFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold text-sm mb-3">تفکیک درس</h3>
          {breakdown.length === 0 ? (
            <p className="text-sm text-gray-400">بدون مطالعه در این بازه</p>
          ) : (
            <>
              <div className="h-44 w-full mb-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="total_seconds"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {breakdown.map((s, i) => (
                        <Cell key={s.name} fill={s.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatSeconds(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-2">
                {breakdown.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: s.color || CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-sm flex-1">{s.name}</span>
                    <span className="text-sm text-gray-600">{formatSeconds(s.total_seconds)}</span>
                    <span className="text-xs text-gray-400">{s.percentage}٪</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-sm mb-3">مقایسه بازه‌ها</h3>
          <div className="h-52 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'امروز', minutes: Math.floor((profile.today || 0) / 60) },
                  { name: 'هفته', minutes: Math.floor((profile.week || 0) / 60) },
                  { name: 'ماه', minutes: Math.floor((profile.month || 0) / 60) },
                ]}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={36} />
                <Tooltip formatter={(v) => [`${v} دقیقه`, 'مطالعه']} />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]} fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-sm mb-3">نقشه حرارتی مطالعه</h3>
        <StudyHeatmap days={profile.heatmap || []} />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-sm">آزمون‌ها و کارنامه</h3>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#F1F5F9', color: PROFILE.inkMuted }}
          >
            به‌زودی
          </span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          کارنامه آزمون‌ها هنوز به این پروفایل متصل نشده است. به‌محض آماده‌شدن داده، اینجا نمایش داده می‌شود.
        </p>
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

function StatCard({ title, value }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-bold mt-1" style={{ color: PROFILE.ink }}>{value}</p>
    </Card>
  );
}

function buildTrend(heatmap, period) {
  if (!heatmap.length) return [];
  if (period === 'daily') {
    return heatmap.slice(-14).map((d) => ({
      label: new Date(`${d.date}T12:00:00`).toLocaleDateString('fa-IR', {
        month: 'numeric',
        day: 'numeric',
      }),
      minutes: Math.floor((d.total_seconds || 0) / 60),
    }));
  }
  if (period === 'weekly') {
    const weeks = [];
    const slice = heatmap.slice(-56);
    for (let i = 0; i < slice.length; i += 7) {
      const chunk = slice.slice(i, i + 7);
      const minutes = Math.floor(
        chunk.reduce((sum, d) => sum + (d.total_seconds || 0), 0) / 60,
      );
      weeks.push({ label: `ه${weeks.length + 1}`, minutes });
    }
    return weeks;
  }
  // monthly: گروه‌بندی تقریبی ۳۰ روزه از ۹۰ روز
  const months = [];
  const slice = heatmap.slice(-90);
  for (let i = 0; i < slice.length; i += 30) {
    const chunk = slice.slice(i, i + 30);
    const minutes = Math.floor(
      chunk.reduce((sum, d) => sum + (d.total_seconds || 0), 0) / 60,
    );
    const label = chunk[0]
      ? new Date(`${chunk[0].date}T12:00:00`).toLocaleDateString('fa-IR', { month: 'short' })
      : `م${months.length + 1}`;
    months.push({ label, minutes });
  }
  return months;
}
