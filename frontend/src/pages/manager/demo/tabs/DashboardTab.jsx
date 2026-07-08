import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, UserCheck, BookOpen, ClipboardCheck, FileText, BarChart2,
  TrendingUp, TrendingDown, Star, AlertTriangle, Activity, Target,
  ChevronRight, Calendar,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import {
  ATTENDANCE_DATA,
  PERFORMANCE_DONUT,
  TOP_STUDENTS,
  TOP_STUDENTS_MOBILE,
  REPORT_CARDS,
} from '../data/dashboardMockData';

function StatCard({ title, value, trend, trendLabel, icon: Icon, iconBg, iconColor, isDanger }) {
  const isNegative = isDanger && trend < 0;
  const trendUp = trend > 0;

  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={CARD_STYLE}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: iconBg || '#D1FAE5' }}
        >
          <Icon size={18} color={iconColor || '#10B981'} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-bold"
          style={{ color: isDanger ? '#EF4444' : '#111827' }}
        >
          {value}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {trendUp ? (
          <TrendingUp size={14} color={isNegative ? '#EF4444' : '#10B981'} />
        ) : (
          <TrendingDown size={14} color={isDanger ? '#10B981' : '#EF4444'} />
        )}
        <span
          className="text-xs font-medium"
          style={{
            color: isDanger
              ? (trend < 0 ? '#10B981' : '#EF4444')
              : (trendUp ? '#10B981' : '#EF4444'),
          }}
        >
          {trendLabel}
        </span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trendLabel, icon: Icon }) {
  return (
    <div className="rounded-3xl p-5 flex items-center gap-4" style={CARD_STYLE}>
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#D1FAE5' }}
      >
        <Icon size={22} color="#10B981" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-sm font-medium text-gray-400 mr-1">{unit}</span>}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp size={12} color="#10B981" />
          <span className="text-xs text-emerald-500 font-medium">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div
        className="rounded-xl px-3 py-2 text-sm font-medium shadow-lg"
        style={{ background: '#111827', color: '#fff' }}
      >
        {payload[0].value}%
      </div>
    );
  }
  return null;
};

function AttendanceChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">نرخ حضور و غیاب در ۳۰ روز اخیر</h3>
        <Activity size={16} color="#10B981" />
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={ATTENDANCE_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            domain={[70, 100]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#attendanceGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function PerformanceDonutChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع عملکرد دانش‌آموزان</h3>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={160} height={160}>
            <Pie
              data={PERFORMANCE_DONUT}
              cx={75}
              cy={75}
              innerRadius={52}
              outerRadius={72}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {PERFORMANCE_DONUT.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-900">۳۲۰</span>
            <span className="text-xs text-gray-500">دانش‌آموز</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {PERFORMANCE_DONUT.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">({item.value}٪)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopStudentsList() {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">دانش‌آموزان برتر این هفته</h3>
        <Star size={16} color="#F59E0B" fill="#F59E0B" />
      </div>
      <div className="flex flex-col gap-2.5">
        {TOP_STUDENTS.map((s) => (
          <div key={s.rank} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{
                background: s.rank <= 3 ? '#FEF3C7' : '#F3F4F6',
                color: s.rank <= 3 ? '#D97706' : '#6B7280',
              }}
            >
              {s.rank <= 3 ? medals[s.rank - 1] : s.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
              <p className="text-xs text-gray-400 truncate">{s.grade}</p>
            </div>
            <div
              className="text-sm font-bold px-2 py-0.5 rounded-lg"
              style={{ background: '#D1FAE5', color: '#059669' }}
            >
              {s.score}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
        <span>بیشتر</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function PerformanceKPICard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={CARD_STYLE}>
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{ background: iconBg || '#D1FAE5' }}
      >
        <Icon size={20} color={iconColor || '#10B981'} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-1">{title}</p>
      </div>
    </div>
  );
}

function ReportCard({ card }) {
  return (
    <div
      className={`rounded-3xl p-5 bg-gradient-to-br ${card.bg} flex flex-col gap-4`}
      style={{ border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: card.iconBg }}
      >
        {card.emoji}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-900 text-sm leading-snug mb-1">{card.title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
      </div>
      <button
        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-2xl transition-all self-start"
        style={{ background: '#10B981', color: '#fff' }}
      >
        <span>مشاهده گزارش</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

function DashboardDesktopBody() {
  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👋 سلام، مدیر عزیز</h1>
        <p className="text-sm text-gray-500 mt-1">نمای کلی عملکرد مدرسه</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard title="دانش‌آموزان" value="۳۲۰" trend={13} trendLabel="+۱۳٪ نسبت به ماه قبل" icon={Users} iconBg="#D1FAE5" iconColor="#10B981" />
        <StatCard title="معلمان" value="۳۳" trend={5} trendLabel="+۵٪ نسبت به ماه قبل" icon={UserCheck} iconBg="#DBEAFE" iconColor="#3B82F6" />
        <StatCard title="آزمون‌ها" value="۲" trend={14} trendLabel="+۱۴٪ نسبت به ماه قبل" icon={FileText} iconBg="#EDE9FE" iconColor="#8B5CF6" />
        <StatCard title="کلاس‌ها" value="۵" trend={2} trendLabel="+۲٪ نسبت به ماه قبل" icon={BookOpen} iconBg="#FEF3C7" iconColor="#F59E0B" />
        <StatCard title="دانش‌آموزان در معرض خطر" value="۲۴" trend={-2} trendLabel="-۲ نفر نسبت به ماه قبل" icon={AlertTriangle} iconBg="#FEE2E2" iconColor="#EF4444" isDanger />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="میانگین نمرات" value="۸۴" unit="/ ۱۰۰" trendLabel="+۲۲٪ نسبت به ماه قبل" icon={Star} />
        <MetricCard title="نرخ حضور و غیاب" value="۹۲٪" trendLabel="+۲.۵٪ نسبت به ماه قبل" icon={ClipboardCheck} />
        <MetricCard title="عملکرد کل مدرسه" value="۷۸٪" trendLabel="+۳.۲٪ نسبت به ماه قبل" icon={BarChart2} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AttendanceChart />
        <PerformanceDonutChart />
        <TopStudentsList />
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">شاخص‌های عملکردی</h2>
        <div className="grid grid-cols-5 gap-4">
          <PerformanceKPICard title="کلاس‌های فعال" value="۲۸" icon={BookOpen} iconBg="#D1FAE5" iconColor="#10B981" />
          <PerformanceKPICard title="مشارکت والدین" value="۵۶٪" icon={Users} iconBg="#DBEAFE" iconColor="#3B82F6" />
          <PerformanceKPICard title="نرخ مشارکت دانش‌آموزان" value="۶۸٪" icon={Activity} iconBg="#EDE9FE" iconColor="#8B5CF6" />
          <PerformanceKPICard title="نسبت دانش‌آموز به معلم" value="۲۰:۱" icon={UserCheck} iconBg="#FEF3C7" iconColor="#F59E0B" />
          <PerformanceKPICard title="نرخ پیشرفت برنامه درسی" value="۶۲٪" icon={Target} iconBg="#FFE4E6" iconColor="#F43F5E" />
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">گزارش‌های مدیریتی</h2>
        <div className="grid grid-cols-5 gap-4">
          {REPORT_CARDS.map((card) => (
            <ReportCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}

const MOBILE_STATS = [
  { title: 'دانش‌آموزان', value: '۳۲۲', trend: '+۱۳٪', icon: Users, iconBg: '#D1FAE5', iconColor: '#10B981' },
  { title: 'معلمان', value: '۳۳', trend: '+۵٪', icon: UserCheck, iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { title: 'کلاس‌ها', value: '۵', trend: '+۵٪', icon: BookOpen, iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
  { title: 'دانش‌آموزان در معرض خطر', value: '۲۴', trend: '-۲ نفر', icon: AlertTriangle, iconBg: '#FEE2E2', iconColor: '#EF4444', isDanger: true },
  { title: 'آزمون‌ها', value: '۲', trend: '+۱۳٪', icon: FileText, iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { title: 'عملکرد کل مدرسه', value: '۷۸٪', trend: '+۳.۵٪', icon: BarChart2, iconBg: '#D1FAE5', iconColor: '#10B981' },
  { title: 'نرخ حضور و غیاب', value: '۹۲٪', trend: '+۳.۵٪', icon: ClipboardCheck, iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { title: 'میانگین نمرات', value: '۸۴/۱۰۰', trend: '+۳۳٪', icon: Star, iconBg: '#FEF3C7', iconColor: '#F59E0B' },
];

function DashboardMobileBody() {
  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">👋 سلام، مدیر عزیز</h1>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <Calendar size={14} color="#10B981" />
          <span>۱۴۰۴-۱۴۰۵</span>
        </div>
      </div>

      <div className="pt-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">دانش‌آموزان برتر این هفته</h2>
          <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
            <span>مشاهده همه</span>
            <ChevronRight size={13} />
          </button>
        </div>
        <div
          className="flex gap-4 overflow-x-auto pb-1 px-1"
          style={{ scrollbarWidth: 'none', overflowY: 'visible' }}
        >
          {TOP_STUDENTS_MOBILE.map((s) => (
            <div key={s.rank} className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 84 }}>
              <div className="relative w-[72px] h-[72px] flex items-end justify-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: s.color }}
                >
                  {s.initials}
                </div>
                <div
                  className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm"
                  style={{
                    background: s.rank === 1 ? '#F59E0B' : '#E5E7EB',
                    color: s.rank === 1 ? '#fff' : '#6B7280',
                    border: '2px solid #fff',
                  }}
                >
                  {s.rank}
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium text-center leading-tight">{s.name}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: '#D1FAE5', color: '#059669' }}>
                {s.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">نرخ حضور و غیاب در ۳۰ اخیر</h2>
          <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
            <span>مشاهده گزارش کامل</span>
            <ChevronRight size={13} />
          </button>
        </div>
        <div className="rounded-3xl p-4" style={CARD_STYLE}>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={ATTENDANCE_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[70, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#mobileGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-1 px-1">
            {['۶ خرداد', '۱۲ خرداد', '۱۸ خرداد', '۲۴ خرداد', '۳۰ خرداد'].map((d) => (
              <span key={d} className="text-xs text-gray-400">{d}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MOBILE_STATS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="rounded-3xl p-4" style={CARD_STYLE}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.iconBg }}>
                  <Icon size={16} color={item.iconColor} />
                </div>
              </div>
              <p className="text-xl font-bold" style={{ color: item.isDanger ? '#EF4444' : '#111827' }}>
                {item.value}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-1 leading-snug">{item.title}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <TrendingUp size={10} color="#10B981" />
                <span className="text-xs font-medium" style={{ color: '#10B981' }}>{item.trend}</span>
                <span className="text-xs text-gray-400">نسبت به ماه قبل</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardDesktop() {
  return (
    <DesktopPageShell>
      <DashboardDesktopBody />
    </DesktopPageShell>
  );
}

export function DashboardMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <DashboardMobileBody />
    </MobilePageShell>
  );
}
