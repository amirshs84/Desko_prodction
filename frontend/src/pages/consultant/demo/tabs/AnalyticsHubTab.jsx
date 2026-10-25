import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, History } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { useConsultant } from '../context/ConsultantContext';
import { useConsultantAnalytics, usePlanRun } from '../hooks/useConsultantQueries';
import { openStudentProfile } from '../lib/navigation';
import { STUDIO } from './planning/studioTheme';
import { formatDuration } from './students/rosterUtils';
import ReportsMobile from './reports/ReportsMobile';
import { ReportsBody } from './reports/ReportsBody';

const AnalyticsCharts = lazy(() => import('./analytics/AnalyticsCharts'));

const CC = STUDIO;
const PERIODS = [
  ['weekly', 'هفتگی'],
  ['monthly', 'ماهانه'],
];

function AnalyticsBody() {
  const navigate = useNavigate();
  const { activeNav } = useConsultant();
  const [period, setPeriod] = useState('weekly');
  const [selectedRunId, setSelectedRunId] = useState(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useConsultantAnalytics(period);
  const { data: detail, isLoading: loadingDetail } = usePlanRun(selectedRunId);

  return (
    <div className="px-4 md:px-8 py-5 md:py-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: CC.ink }}>گزارش‌ها</h2>
          <p className="text-sm mt-1" style={{ color: CC.muted }}>
            تحلیل کوهورت، بازدهی کلاس‌ها و تاریخچه اقدامات
          </p>
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-white self-start" style={{ border: `1px solid ${CC.border}` }}>
          {PERIODS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: period === id ? CC.brand : 'transparent',
                color: period === id ? '#fff' : CC.muted,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: '#FEF2F2', color: CC.danger }}>
          {error?.response?.data?.detail || 'بارگذاری گزارش‌ها ناموفق بود.'}
          <button type="button" className="mr-3 underline" onClick={() => refetch()}>
            تلاش دوباره
          </button>
        </div>
      )}

      {isLoading ? (
        <HubSkeleton />
      ) : (
        <>
          <SummaryStrip data={data} fetching={isFetching} />

          <Suspense fallback={<ChartsSkeleton />}>
            <AnalyticsCharts data={data} />
          </Suspense>

          <ActionsPanel
            actions={data?.recent_actions || []}
            selectedId={selectedRunId}
            onSelect={setSelectedRunId}
            detail={detail}
            loadingDetail={loadingDetail}
            onOpenStudent={(id) =>
              openStudentProfile(navigate, id, { fromTab: activeNav || 'analytics' })
            }
            onCloseDetail={() => setSelectedRunId(null)}
          />
        </>
      )}
    </div>
  );
}

function SummaryStrip({ data, fetching }) {
  const classes = data?.class_performance || [];
  const top = classes[0];
  const plan = data?.plan_execution || {};
  const totalHours = classes.reduce((s, c) => s + (c.total_study_seconds || 0), 0);

  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-wrap gap-4 items-center"
      style={{
        background: `linear-gradient(135deg, ${CC.brandSoft}, #fff)`,
        border: `1px solid ${CC.border}`,
        opacity: fetching ? 0.85 : 1,
      }}
    >
      <StripStat icon={BarChart3} label="کلاس‌ها" value={classes.length} />
      <StripStat label="ساعات کل" value={formatDuration(totalHours)} />
      <StripStat
        label="بهترین کلاس"
        value={top ? `${top.name} · ${top.avg_progress_percent}%` : '—'}
      />
      <StripStat
        label="نرخ پذیرش برنامه"
        value={`${Math.round((plan.accept_rate || 0) * 100)}%`}
      />
    </div>
  );
}

function StripStat({ icon: Icon, label, value }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[11px] flex items-center gap-1" style={{ color: CC.muted }}>
        {Icon ? <Icon size={12} /> : null}
        {label}
      </p>
      <p className="text-sm font-bold mt-0.5" style={{ color: CC.ink }}>{value}</p>
    </div>
  );
}

function ActionsPanel({
  actions, selectedId, onSelect, detail, loadingDetail, onOpenStudent, onCloseDetail,
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${CC.border}` }}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: CC.border }}>
        <History size={16} color={CC.brand} />
        <div>
          <h3 className="text-sm font-bold" style={{ color: CC.ink }}>اقدامات و اجراها</h3>
          <p className="text-xs" style={{ color: CC.muted }}>تاریخچه برنامه‌های گروهی</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5">
        <ul className="lg:col-span-2 divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: CC.border }}>
          {actions.length === 0 && (
            <li className="px-4 py-8 text-sm text-center" style={{ color: CC.muted }}>
              اجرایی ثبت نشده است
            </li>
          )}
          {actions.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => onSelect(run.id)}
                className="w-full text-right px-4 py-3 transition-colors"
                style={{
                  background: selectedId === run.id ? CC.brandSoft : 'transparent',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: CC.ink }}>
                  {modeLabel(run.mode)} · {run.intensity}
                </p>
                <p className="text-xs mt-1" style={{ color: CC.muted }}>
                  {run.student_count} دانش‌آموز
                  {run.pending_count ? ` · ${run.pending_count} در انتظار` : ''}
                  {run.accepted_count ? ` · ${run.accepted_count} پذیرفته` : ''}
                </p>
                {run.created_at && (
                  <p className="text-[11px] mt-1" style={{ color: CC.muted }}>
                    {new Date(run.created_at).toLocaleString('fa-IR')}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="lg:col-span-3 p-4 border-t lg:border-t-0 lg:border-r" style={{ borderColor: CC.border }}>
          {!selectedId && (
            <p className="text-sm py-10 text-center" style={{ color: CC.muted }}>
              یک اجرا را برای دیدن جزئیات انتخاب کنید
            </p>
          )}
          {selectedId && loadingDetail && <DetailSkeleton />}
          {selectedId && !loadingDetail && detail && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-bold text-sm" style={{ color: CC.ink }}>
                  اجرا #{detail.id} · {modeLabel(detail.mode)}
                </h4>
                <p className="text-xs mt-1" style={{ color: CC.muted }}>
                  شدت: {detail.intensity}
                  {detail.group_tag ? ` · ${detail.group_tag}` : ''}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs border-b" style={{ color: CC.muted, borderColor: CC.border }}>
                      <th className="py-2 text-right font-medium">دانش‌آموز</th>
                      <th className="py-2 text-right font-medium">وضعیت</th>
                      <th className="py-2 text-right font-medium">بلوک</th>
                      <th className="py-2 text-right font-medium">اکشن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.proposals || []).map((p) => (
                      <tr key={p.id} className="border-b" style={{ borderColor: `${CC.border}88` }}>
                        <td className="py-2.5">{p.student_name || p.student_id}</td>
                        <td className="py-2.5">{statusLabel(p.status)}</td>
                        <td className="py-2.5">
                          {p.block_count}
                          {p.shortfall_minutes ? ` · کمبود ${p.shortfall_minutes}د` : ''}
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => onOpenStudent(p.student_id)}
                            className="text-xs font-medium px-2 py-1 rounded-lg"
                            style={{ background: CC.brandSoft, color: CC.brandStrong }}
                          >
                            پروفایل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={onCloseDetail}
                className="self-start text-xs font-medium px-3 py-2 rounded-xl"
                style={{ background: CC.pageBg, color: CC.muted }}
              >
                بستن جزئیات
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HubSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-16 rounded-2xl bg-emerald-50/80" />
      <ChartsSkeleton />
      <div className="h-64 rounded-2xl bg-white border border-emerald-50" />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-72 rounded-2xl animate-pulse"
          style={{ background: 'linear-gradient(180deg, #ECFDF5, #fff)', border: `1px solid ${CC.border}` }}
        />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3 py-2">
      <div className="h-4 w-1/3 rounded bg-emerald-50" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
      <div className="h-32 rounded-xl bg-gray-50" />
    </div>
  );
}

function modeLabel(mode) {
  return mode === 'forced' ? 'قطعی' : 'پیشنهادی';
}

function statusLabel(status) {
  if (status === 'accepted') return 'پذیرفته';
  if (status === 'rejected') return 'رد شده';
  return 'در انتظار';
}

export function AnalyticsDesktop() {
  return (
    <DesktopPageShell>
      <ReportsBody />
    </DesktopPageShell>
  );
}

export function AnalyticsMobile({ onMenuClick }) {
  return (
    <MobilePageShell hideHeader>
      <ReportsMobile onMenuClick={onMenuClick} />
    </MobilePageShell>
  );
}
