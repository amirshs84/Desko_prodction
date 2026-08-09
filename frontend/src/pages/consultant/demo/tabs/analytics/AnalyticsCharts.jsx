import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STUDIO } from '../planning/studioTheme';

const CC = STUDIO;

export default function AnalyticsCharts({ data }) {
  const classes = data?.class_performance || [];
  const radar = data?.subject_radar || [];
  const trend = data?.study_trend || [];
  const flow = data?.cohort_flow;
  const exam = data?.exam_trend;
  const plan = data?.plan_execution || {};

  const classBars = classes.map((c) => ({
    name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
    fullName: c.name,
    hours: Math.round((c.avg_study_seconds / 3600) * 10) / 10,
    progress: c.avg_progress_percent,
    students: c.student_count,
  }));

  const radarData = radar.map((r) => ({
    subject: r.subject,
    balance: r.balance,
    share: r.share_percent,
    hours: Math.round((r.total_seconds / 3600) * 10) / 10,
  }));

  const sankeyData = {
    nodes: (flow?.nodes || []).map((n) => ({ name: n.name })),
    links: (flow?.links || []).map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    })),
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard
        title="بازدهی کلاس‌ها"
        subtitle="میانگین ساعات مطالعه در بازه انتخابی"
      >
        {classBars.length === 0 ? (
          <EmptyChart text="کلاسی برای مقایسه نیست." />
        ) : (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classBars} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EA" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CC.muted }} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11, fill: CC.muted }} unit="h" />
                <Tooltip content={<ClassTooltip />} />
                <Bar dataKey="hours" fill={CC.brand} radius={[8, 8, 0, 0]} name="میانگین ساعات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="روند آزمون‌ها"
        subtitle={exam?.available ? 'میانگین تراز' : 'به‌زودی'}
      >
        {exam?.available && (exam.points || []).length > 0 ? (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={exam.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EA" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CC.muted }} />
                <YAxis tick={{ fontSize: 11, fill: CC.muted }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke={CC.brand} fill={CC.brandSoft} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium" style={{ color: CC.ink }}>داده آزمون هنوز متصل نیست</p>
            <p className="text-xs leading-6" style={{ color: CC.muted }}>
              {exam?.note || 'پس از اتصال ماژول آزمون، روند تراز اینجا نمایش داده می‌شود.'}
            </p>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="روند مطالعه مدرسه"
        subtitle="مجموع ساعات روزانه همه دانش‌آموزان"
      >
        {trend.length === 0 ? (
          <EmptyChart text="روندی برای نمایش نیست." />
        ) : (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hubStudyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CC.brand} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CC.brand} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EA" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: CC.muted }}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: CC.muted }} unit="h" />
                <Tooltip
                  formatter={(value) => [`${value} ساعت`, 'مطالعه']}
                  labelFormatter={(label) => `تاریخ ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke={CC.brand}
                  fill="url(#hubStudyFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="بالانس دروس"
        subtitle="نمودار عنکبوتی نقاط ضعف و قوت مطالعاتی"
      >
        {radarData.length < 3 ? (
          <EmptyChart text="برای رادار حداقل ۳ درس با داده لازم است." />
        ) : (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#D1FAE5" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: CC.ink }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: CC.muted }} />
                <Tooltip content={<RadarTooltip />} />
                <Radar
                  name="بالانس"
                  dataKey="balance"
                  stroke={CC.brandStrong}
                  fill={CC.brand}
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="جریان پیشرفت کوهورت"
        subtitle={flow?.note || 'انتقال بین سطوح عملکرد'}
        wide
      >
        {(sankeyData.links || []).length === 0 ? (
          <EmptyChart text="برای رسم جریان، داده دو بازه متوالی لازم است." />
        ) : (
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                nodePadding={28}
                margin={{ top: 12, right: 160, bottom: 12, left: 16 }}
                linkCurvature={0.5}
                node={{ fill: CC.brand, stroke: CC.brandStrong, strokeWidth: 1 }}
                link={{ stroke: CC.brandMid }}
              >
                <Tooltip content={<SankeyTooltip nodes={sankeyData.nodes} />} />
              </Sankey>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="نرخ اجرای برنامه" subtitle="پذیرش پیشنهادها در اجراهای اخیر">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Kpi label="نرخ پذیرش" value={`${Math.round((plan.accept_rate || 0) * 100)}%`} />
          <Kpi label="اجراها" value={plan.runs_total ?? 0} />
          <Kpi label="پذیرفته" value={plan.accepted ?? 0} tone="ok" />
          <Kpi label="در انتظار" value={plan.pending ?? 0} tone="warn" />
        </div>
        <p className="text-xs" style={{ color: CC.muted }}>
          قطعی: {plan.forced_runs ?? 0} · پیشنهادی: {plan.suggested_runs ?? 0}
          {plan.rejected != null ? ` · رد شده: ${plan.rejected}` : ''}
        </p>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children, wide }) {
  return (
    <div
      className={`rounded-2xl p-4 ${wide ? 'lg:col-span-2' : ''}`}
      style={{ background: '#fff', border: `1px solid ${CC.border}` }}
    >
      <h3 className="text-sm font-bold" style={{ color: CC.ink }}>{title}</h3>
      {subtitle && (
        <p className="text-xs mt-0.5 mb-3" style={{ color: CC.muted }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="h-56 flex items-center justify-center">
      <p className="text-sm" style={{ color: CC.muted }}>{text}</p>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const color = tone === 'ok' ? CC.brandStrong : tone === 'warn' ? CC.warn : CC.ink;
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: CC.pageBg }}>
      <p className="text-[11px]" style={{ color: CC.muted }}>{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

function ClassTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-md" style={{ background: '#fff', border: `1px solid ${CC.border}` }}>
      <p className="font-bold mb-1" style={{ color: CC.ink }}>{row.fullName}</p>
      <p style={{ color: CC.muted }}>میانگین مطالعه: {row.hours} ساعت</p>
      <p style={{ color: CC.muted }}>پیشروی: {row.progress}٪</p>
      <p style={{ color: CC.muted }}>{row.students} دانش‌آموز</p>
    </div>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-md" style={{ background: '#fff', border: `1px solid ${CC.border}` }}>
      <p className="font-bold mb-1" style={{ color: CC.ink }}>{row.subject}</p>
      <p style={{ color: CC.muted }}>سهم: {row.share}٪</p>
      <p style={{ color: CC.muted }}>حجم: {row.hours} ساعت</p>
    </div>
  );
}

function SankeyTooltip({ active, payload, nodes }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  if (item.source != null && item.target != null) {
    const from = nodes[item.source]?.name || item.source;
    const to = nodes[item.target]?.name || item.target;
    return (
      <div className="rounded-xl px-3 py-2 text-xs shadow-md" style={{ background: '#fff', border: `1px solid ${CC.border}` }}>
        <p className="font-bold" style={{ color: CC.ink }}>{from} → {to}</p>
        <p style={{ color: CC.muted }}>{item.value} دانش‌آموز</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-md" style={{ background: '#fff', border: `1px solid ${CC.border}` }}>
      <p className="font-bold" style={{ color: CC.ink }}>{item.name}</p>
    </div>
  );
}
