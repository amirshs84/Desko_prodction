import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Calendar, ChevronDown, Search, SlidersHorizontal,
  TrendingUp, TrendingDown, UserX, Clock, UserCheck, AlertTriangle,
  MoreVertical, ChevronLeft, ChevronRight, ClipboardCheck,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import {
  ATTENDANCE_TREND_DATA,
  ATTENDANCE_STATUS_DISTRIBUTION,
  ATTENDANCE_SUMMARY_STATS,
  AT_RISK_STUDENTS,
  CLASSES_MOST_ABSENCE,
  ATTENDANCE_TABLE,
  STATUS_CONFIG,
  TABLE_TABS,
} from '../data/attendanceMockData';

const RADIAN = Math.PI / 180;
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const TrendTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-sm font-medium shadow-lg" style={{ background: '#111827', color: '#fff' }}>
        {payload[0].value}٪
      </div>
    );
  }
  return null;
};

function SummaryIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'attendance': return <TrendingUp {...props} />;
    case 'absent': return <UserX {...props} />;
    case 'delay': return <Clock {...props} />;
    case 'teacher': return <UserCheck {...props} />;
    case 'risk': return <AlertTriangle {...props} />;
    default: return <ClipboardCheck {...props} />;
  }
}

function SummaryStatCard({ stat }) {
  const trendColor = stat.isWarning
    ? '#F59E0B'
    : stat.isPositiveDown
      ? (stat.trendUp ? '#EF4444' : '#10B981')
      : (stat.trendUp ? '#10B981' : '#EF4444');

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
      {stat.subtext ? (
        <span className="text-xs text-gray-400">{stat.subtext}</span>
      ) : (
        <div className="flex items-center gap-1">
          {stat.trendUp ? (
            <TrendingUp size={12} color={trendColor} />
          ) : (
            <TrendingDown size={12} color={trendColor} />
          )}
          <span className="text-xs font-medium" style={{ color: trendColor }}>{stat.trend}</span>
          <span className="text-xs text-gray-400">{stat.trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function AttendancePageHeader({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>
          👋 حضور و غیاب
        </h1>
        <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          مدیریت حضور و غیاب دانش‌آموزان و معلمان
        </p>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-shrink-0'}`}>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <Calendar size={16} color="#10B981" />
          <span>۱۴۰۴/۰۳/۲۷</span>
          <ChevronDown size={14} color="#9CA3AF" />
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <span>همه کلاس‌ها</span>
          <ChevronDown size={14} color="#9CA3AF" />
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Plus size={16} />
          <span>ثبت حضور و غیاب</span>
        </button>
      </div>
    </div>
  );
}

function StatusDistributionChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع وضعیت حضور و غیاب</h3>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={160} height={160}>
            <Pie
              data={ATTENDANCE_STATUS_DISTRIBUTION}
              cx={75}
              cy={75}
              innerRadius={52}
              outerRadius={72}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {ATTENDANCE_STATUS_DISTRIBUTION.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-500 text-center leading-tight">کل دانش‌آموزان</span>
            <span className="text-lg font-bold text-gray-900">۳۲۰ نفر</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {ATTENDANCE_STATUS_DISTRIBUTION.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">
                {item.value}٪ ({item.count} نفر)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceTrendChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">نمودار روند حضور و غیاب (۳۰ روز اخیر)</h3>
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <span>۳۰ روز اخیر</span>
          <ChevronDown size={12} color="#9CA3AF" />
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={ATTENDANCE_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="attendanceTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[60, 100]}
            ticks={[60, 70, 80, 90, 100]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}٪`}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#attendanceTrendGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AtRiskStudentsWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} color="#EF4444" />
        <h3 className="font-bold text-gray-900 text-sm">دانش‌آموزان در معرض خطر</h3>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {AT_RISK_STUDENTS.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: '#FEE2E2', color: '#EF4444' }}
            >
              {s.days} روز غیبت
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: s.color }}
            >
              {s.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
              <p className="text-xs text-gray-500 truncate">{s.className}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function ClassesMostAbsenceWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">کلاس‌های با بیشترین غیبت</h3>
      <div className="flex flex-col gap-4 flex-1">
        {CLASSES_MOST_ABSENCE.map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
              <span className="text-sm font-bold" style={{ color: item.color }}>{item.rate}٪</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${item.rate * 4}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function FilterDropdown({ label }) {
  return (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
    >
      <span>{label}</span>
      <ChevronDown size={12} color="#9CA3AF" />
    </button>
  );
}

function AttendanceDataTable({ compact, activeTab }) {
  if (activeTab !== 'students') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#F9FAFB' }}>
        <p className="text-sm text-gray-500">
          {activeTab === 'teachers' ? 'لیست حضور و غیاب معلمان' : 'گزارشات حضور و غیاب'}
          {' '}— به‌زودی
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center gap-2'} mb-4 flex-wrap`}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm flex-1 min-w-[180px]"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            placeholder="جستجوی نام دانش‌آموز..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 text-sm"
          />
        </div>
        <FilterDropdown label="کلید" />
        <FilterDropdown label="کلاس" />
        <FilterDropdown label="تاریخ" />
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <SlidersHorizontal size={14} />
          <span>فیلترها</span>
        </button>
      </div>

      <div className={compact ? 'overflow-x-auto' : ''}>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['ردیف', 'دانش‌آموز', 'کلاس', 'وضعیت', 'ساعت ورود', 'ساعت خروج', 'توضیحات', ''].map((col, i) => (
                <th key={i} className="text-xs text-gray-400 font-medium text-right pb-3 px-2 first:pr-0 last:pl-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ATTENDANCE_TABLE.map((row, index) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0">
                <td className="py-3.5 px-2 first:pr-0 text-xs text-gray-500">{index + 1}</td>
                <td className="py-3.5 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: row.color }}
                    >
                      {row.initials}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{row.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-2 text-sm text-gray-600">{row.className}</td>
                <td className="py-3.5 px-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-3.5 px-2 text-sm text-gray-700 dir-ltr text-right">{row.entry}</td>
                <td className="py-3.5 px-2 text-sm text-gray-700 dir-ltr text-right">{row.exit}</td>
                <td className="py-3.5 px-2 text-xs text-gray-500">{row.note}</td>
                <td className="py-3.5 px-2 last:pl-0">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100">
                    <MoreVertical size={16} color="#9CA3AF" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">نمایش ۱ تا ۵ از ۳۲۰ مورد</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
          {[1, 2, '...', 44].map((page, i) => (
            <button
              key={i}
              className="w-8 h-8 rounded-lg text-xs font-medium"
              style={{
                background: page === 1 ? '#10B981' : 'transparent',
                color: page === 1 ? '#fff' : '#6B7280',
              }}
            >
              {page}
            </button>
          ))}
          <button className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft size={16} color="#9CA3AF" />
          </button>
        </div>
      </div>
    </>
  );
}

function AttendanceTableSection({ compact }) {
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex gap-1 mb-5 p-1 rounded-2xl w-fit" style={{ background: '#F3F4F6' }}>
        {TABLE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? '#10B981' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#6B7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AttendanceDataTable compact={compact} activeTab={activeTab} />
    </div>
  );
}

function AttendanceBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <AttendancePageHeader compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {ATTENDANCE_SUMMARY_STATS.map((stat) => (
          <SummaryStatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <StatusDistributionChart />
        <AttendanceTrendChart />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <AtRiskStudentsWidget />
        <ClassesMostAbsenceWidget />
      </div>

      <AttendanceTableSection compact={compact} />

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function AttendanceDesktop() {
  return (
    <DesktopPageShell>
      <AttendanceBody />
    </DesktopPageShell>
  );
}

export function AttendanceMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <AttendanceBody compact />
    </MobilePageShell>
  );
}
