import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, BookMarked, ChevronDown, TrendingUp,
  FileText, Download, Share2, Calendar,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import {
  REPORTS_SUMMARY_STATS,
  REPORT_CATEGORIES,
  LATEST_REPORTS,
  MOST_USED_REPORTS,
  CREATION_TREND,
  REPORT_FORMATS,
  REPORT_PERFORMANCE,
  formatCountFa,
} from '../data/reportsMockData';

const RADIAN = Math.PI / 180;
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function SummaryIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'created': return <FileText {...props} />;
    case 'scheduled': return <Calendar {...props} />;
    case 'download': return <Download {...props} />;
    case 'share': return <Share2 {...props} />;
    default: return <FileText {...props} />;
  }
}

function ReportTypeIcon({ type, color }) {
  const props = { size: 16, color };
  switch (type) {
    case 'excel': return <FileText {...props} />;
    case 'word': return <FileText {...props} />;
    default: return <FileText {...props} />;
  }
}

function SummaryStatCard({ stat }) {
  return (
    <div className="rounded-3xl p-4 flex flex-col gap-2" style={CARD_STYLE}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{stat.title}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: stat.iconBg }}
        >
          <SummaryIcon type={stat.icon} color={stat.iconColor} />
        </div>
      </div>
      <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
      <div className="flex items-center gap-1">
        <TrendingUp size={12} color="#10B981" />
        <span className="text-xs font-medium text-emerald-500">{stat.trend}</span>
        <span className="text-xs text-gray-400">{stat.trendLabel}</span>
      </div>
    </div>
  );
}

function ReportsPageHeader({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#EDE9FE' }}
        >
          <BookMarked size={22} color="#8B5CF6" />
        </div>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>گزارش‌ها</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            نمای کلی گزارش‌های مدرسه
          </p>
        </div>
      </div>
      <button
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white ${compact ? 'self-start' : ''}`}
        style={{ background: '#10B981' }}
      >
        <Plus size={16} />
        <span>گزارش جدید</span>
      </button>
    </div>
  );
}

function TimeRangeDropdown({ label }) {
  return (
    <button
      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
    >
      <span>{label}</span>
      <ChevronDown size={12} color="#9CA3AF" />
    </button>
  );
}

function ReportCategoriesChart() {
  return (
    <div className="rounded-3xl p-5 h-full" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">دسته‌بندی گزارش‌ها</h3>
        <TimeRangeDropdown label="همه زمان‌ها" />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={150} height={150}>
            <Pie
              data={REPORT_CATEGORIES}
              cx={70}
              cy={70}
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {REPORT_CATEGORIES.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-gray-900">۲۸</span>
            <span className="text-xs text-gray-500">کل گزارش‌ها</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {REPORT_CATEGORIES.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">{item.value}٪</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LatestReportsWidget() {
  return (
    <div className="rounded-3xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">جدیدترین گزارش‌ها</h3>
        <button className="text-xs font-semibold" style={{ color: '#10B981' }}>مشاهده همه</button>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {LATEST_REPORTS.map((report, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${report.color}15` }}
            >
              <ReportTypeIcon type={report.type} color={report.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
              <p className="text-xs text-gray-500">{report.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MostUsedReportsWidget() {
  return (
    <div className="rounded-3xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">پرکاربردترین گزارش‌ها</h3>
      <div className="flex flex-col gap-3 flex-1">
        {MOST_USED_REPORTS.map((report, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: '#D1FAE5', color: '#059669' }}
            >
              {formatCountFa(report.count)} بار
            </span>
            <p className="text-sm font-medium text-gray-900 flex-1 truncate">{report.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreationTrendChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">روند ایجاد گزارش‌ها</h3>
        <TimeRangeDropdown label="۶ ماه اخیر" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={CREATION_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            formatter={(value) => [`${value} گزارش`, 'تعداد']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportFormatsChart() {
  return (
    <div className="rounded-3xl p-5 h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">فرمت‌های گزارش</h3>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={130} height={130}>
            <Pie
              data={REPORT_FORMATS}
              cx={60}
              cy={60}
              innerRadius={40}
              outerRadius={58}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {REPORT_FORMATS.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {REPORT_FORMATS.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">{item.value}٪</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportPerformanceWidget() {
  return (
    <div className="rounded-3xl p-5 h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">عملکرد گزارش‌ها</h3>
      <div className="flex flex-col gap-4">
        {REPORT_PERFORMANCE.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-emerald-600">{formatCountFa(item.percent)}٪</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${item.percent}%`, background: '#10B981' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <ReportsPageHeader compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {REPORTS_SUMMARY_STATS.map((stat) => (
          <SummaryStatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <MostUsedReportsWidget />
        <LatestReportsWidget />
        <ReportCategoriesChart />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <ReportPerformanceWidget />
        <ReportFormatsChart />
        <CreationTrendChart />
      </div>

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function ReportsDesktop() {
  return (
    <DesktopPageShell>
      <ReportsBody />
    </DesktopPageShell>
  );
}

export function ReportsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <ReportsBody compact />
    </MobilePageShell>
  );
}
