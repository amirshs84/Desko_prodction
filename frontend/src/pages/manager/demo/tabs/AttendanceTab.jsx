import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Calendar, ChevronDown, Search, SlidersHorizontal,
  TrendingUp, TrendingDown, UserX, Clock, UserCheck, AlertTriangle,
  MoreVertical, ChevronLeft, ChevronRight, ClipboardCheck,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import { useManagerAttendance } from '../hooks/useManagerAttendance';
import { toPersianDigits, formatCount } from '../utils/classDataTransformers';

const RADIAN = Math.PI / 180;
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${toPersianDigits(Math.round(percent * 100))}%`}
    </text>
  );
};

const TrendTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-sm font-medium shadow-lg" style={{ background: '#111827', color: '#fff' }}>
        {toPersianDigits(payload[0].value)}٪
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

function AttendancePageHeader({ compact, date, classId, classOptions, onClassChange }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>
          👋 حضور و غیاب
        </h1>
        <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          بر اساس فعالیت مطالعه دانش‌آموزان در روز
        </p>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-shrink-0'}`}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <Calendar size={16} color="#10B981" />
          <span>{date ? toPersianDigits(date) : 'امروز'}</span>
        </div>
        <div className="relative">
          <select
            value={classId}
            onChange={(e) => onClassChange(e.target.value)}
            className="appearance-none pl-8 pr-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer outline-none"
            style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
          >
            {(classOptions.length ? classOptions : [{ id: '', name: 'همه کلاس‌ها' }]).map((opt) => (
              <option key={opt.id || 'all'} value={opt.id}>{opt.name}</option>
            ))}
          </select>
          <ChevronDown size={14} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

function StatusDistributionChart({ data, totalStudents }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع وضعیت حضور و غیاب</h3>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx={75}
              cy={75}
              innerRadius={52}
              outerRadius={72}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-500 text-center leading-tight">کل دانش‌آموزان</span>
            <span className="text-lg font-bold text-gray-900">{formatCount(totalStudents)} نفر</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">
                {toPersianDigits(item.value)}٪ ({formatCount(item.count)} نفر)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceTrendChart({ data, yDomain }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">نمودار روند حضور و غیاب (۳۰ روز اخیر)</h3>
        <span
          className="px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          ۳۰ روز اخیر
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">داده‌ای موجود نیست</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              domain={yDomain || [0, 100]}
              tick={{ fontSize: 9, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${toPersianDigits(v)}٪`}
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
      )}
    </div>
  );
}

function AtRiskStudentsWidget({ students }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} color="#EF4444" />
        <h3 className="font-bold text-gray-900 text-sm">دانش‌آموزان در معرض خطر</h3>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 flex-1">دانش‌آموز پرریسکی نیست</p>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {students.map((s) => (
            <div key={s.userId || s.name} className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: '#FEE2E2', color: '#EF4444' }}
              >
                {s.daysLabel} روز غیبت
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
      )}
    </div>
  );
}

function ClassesMostAbsenceWidget({ items }) {
  const maxRate = Math.max(...items.map((i) => i.rate), 1);
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">کلاس‌های با بیشترین غیبت</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 flex-1">کلاسی یافت نشد</p>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {items.map((item) => (
            <div key={item.classId || item.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                <span className="text-sm font-bold" style={{ color: item.color }}>{item.rateLabel}٪</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(item.rate / maxRate) * 100}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, statusConfig }) {
  const config = statusConfig[status] || statusConfig.absent;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function AttendanceDataTable({
  compact,
  activeTab,
  rows,
  tableMeta,
  page,
  goToPage,
  search,
  setSearch,
  statusConfig,
  loading,
}) {
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

  const start = tableMeta.count === 0 ? 0 : (page - 1) * tableMeta.pageSize + 1;
  const end = Math.min(page * tableMeta.pageSize, tableMeta.count);
  const totalPages = tableMeta.totalPages || 1;

  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page, '...', totalPages];
  })();

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام دانش‌آموز..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 text-sm"
          />
        </div>
        <button
          type="button"
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
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm text-gray-500">در حال بارگذاری...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm text-gray-400">دانش‌آموزی یافت نشد</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3.5 px-2 first:pr-0 text-xs text-gray-500">
                    {toPersianDigits(start + index)}
                  </td>
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
                    <StatusBadge status={row.status} statusConfig={statusConfig} />
                  </td>
                  <td className="py-3.5 px-2 text-sm text-gray-700 dir-ltr text-right">{row.entry}</td>
                  <td className="py-3.5 px-2 text-sm text-gray-700 dir-ltr text-right">{row.exit}</td>
                  <td className="py-3.5 px-2 text-xs text-gray-500">{row.note}</td>
                  <td className="py-3.5 px-2 last:pl-0">
                    <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100">
                      <MoreVertical size={16} color="#9CA3AF" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          نمایش {toPersianDigits(start)} تا {toPersianDigits(end)} از {formatCount(tableMeta.count)} مورد
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
          {pageNumbers.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => typeof p === 'number' && goToPage(p)}
              disabled={p === '...'}
              className="w-8 h-8 rounded-lg text-xs font-medium disabled:cursor-default"
              style={{
                background: p === page ? '#10B981' : 'transparent',
                color: p === page ? '#fff' : '#6B7280',
              }}
            >
              {typeof p === 'number' ? toPersianDigits(p) : p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} color="#9CA3AF" />
          </button>
        </div>
      </div>
    </>
  );
}

function AttendanceTableSection({
  compact,
  rows,
  tableMeta,
  page,
  goToPage,
  search,
  setSearch,
  statusConfig,
  tableTabs,
  loading,
}) {
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex gap-1 mb-5 p-1 rounded-2xl w-fit" style={{ background: '#F3F4F6' }}>
        {tableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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
      <AttendanceDataTable
        compact={compact}
        activeTab={activeTab}
        rows={rows}
        tableMeta={tableMeta}
        page={page}
        goToPage={goToPage}
        search={search}
        setSearch={setSearch}
        statusConfig={statusConfig}
        loading={loading}
      />
    </div>
  );
}

function AttendanceLoading({ compact }) {
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';
  return (
    <div className={padding}>
      <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>👋 حضور و غیاب</h1>
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">در حال بارگذاری...</p>
      </div>
    </div>
  );
}

function AttendanceBody({ compact }) {
  const {
    loading,
    error,
    date,
    totalStudents,
    summaryStats,
    statusDistribution,
    attendanceTrend,
    chartYDomain,
    atRiskStudents,
    classesMostAbsence,
    tableRows,
    tableMeta,
    classOptions,
    statusConfig,
    tableTabs,
    search,
    setSearch,
    classId,
    setClassId,
    page,
    goToPage,
  } = useManagerAttendance();

  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  if (loading && !date) {
    return <AttendanceLoading compact={compact} />;
  }

  return (
    <div className={`${padding} ${spacing}`}>
      <AttendancePageHeader
        compact={compact}
        date={date}
        classId={classId}
        classOptions={classOptions}
        onClassChange={setClassId}
      />

      {error && (
        <div className="p-4 rounded-2xl text-sm text-red-700" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {summaryStats.map((stat) => (
          <SummaryStatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <StatusDistributionChart data={statusDistribution} totalStudents={totalStudents} />
        <AttendanceTrendChart data={attendanceTrend} yDomain={chartYDomain} />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <AtRiskStudentsWidget students={atRiskStudents} />
        <ClassesMostAbsenceWidget items={classesMostAbsence} />
      </div>

      <AttendanceTableSection
        compact={compact}
        rows={tableRows}
        tableMeta={tableMeta}
        page={page}
        goToPage={goToPage}
        search={search}
        setSearch={setSearch}
        statusConfig={statusConfig}
        tableTabs={tableTabs}
        loading={loading}
      />

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
