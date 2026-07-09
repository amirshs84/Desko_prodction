import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie,
} from 'recharts';
import {
  Plus, Calendar, Download, Search, ChevronDown, SlidersHorizontal,
  UserCheck, BookOpen, AlertTriangle, Award,
  MoreHorizontal, ChevronLeft, ChevronRight, TrendingUp, Star, ClipboardCheck,
  FileText, UserPlus,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE, EmptyDataMessage } from '../components/DemoUi';
import {
  TEACHER_PERFORMANCE_BARS,
  SUBJECT_TEACHER_DISTRIBUTION,
  WORKFORCE_SUMMARY,
  TEACHERS_TABLE,
  TOP_TEACHERS,
  TEACHERS_NEEDING_ATTENTION,
  RECENT_TEACHER_ACTIVITIES,
  TEACHERS_FOOTER_KPIS,
  getRatingColor,
  formatRating,
  formatAttendance,
  formatCount,
} from '../data/teachersMockData';

const RADIAN = Math.PI / 180;
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function SummaryIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'active': return <UserCheck {...props} />;
    case 'experience': return <Award {...props} />;
    case 'classes': return <BookOpen {...props} />;
    case 'excellent': return <Star {...props} />;
    case 'alert': return <AlertTriangle {...props} />;
    default: return <UserCheck {...props} />;
  }
}

function ActivityIcon({ type, color }) {
  const props = { size: 16, color };
  switch (type) {
    case 'plus': return <UserPlus {...props} />;
    case 'grade': return <FileText {...props} />;
    case 'schedule': return <Calendar {...props} />;
    case 'attendance': return <ClipboardCheck {...props} />;
    default: return <FileText {...props} />;
  }
}

function FooterKpiIcon({ type, color }) {
  const props = { size: 18, color };
  switch (type) {
    case 'teacher': return <UserCheck {...props} />;
    case 'book': return <BookOpen {...props} />;
    case 'star': return <Star {...props} />;
    case 'clipboard': return <ClipboardCheck {...props} />;
    default: return <UserCheck {...props} />;
  }
}

function FilterDropdown({ label }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
      style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
    >
      <span>{label}</span>
      <ChevronDown size={14} color="#9CA3AF" />
    </button>
  );
}

function TeachersPageHeader({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#DBEAFE' }}
        >
          <UserCheck size={22} color="#3B82F6" />
        </div>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>داشبورد معلمان</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            نمای کلی عملکرد و وضعیت کادر آموزشی
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-shrink-0'}`}>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Plus size={16} />
          <span>افزودن معلم جدید</span>
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <Calendar size={16} color="#10B981" />
          <span>مشاهده برنامه تدریس</span>
        </button>
      </div>
    </div>
  );
}

function TeachersFiltersRow({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between gap-4'}`}>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : ''}`}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm min-w-[200px]"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}
        >
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="جستجوی معلم..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 text-sm"
          />
        </div>
        <FilterDropdown label="همه دروس" />
        <FilterDropdown label="همه وضعیت‌ها" />
        <button
          className="p-2.5 rounded-2xl hover:bg-white transition-all"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}
        >
          <SlidersHorizontal size={18} color="#6B7280" />
        </button>
      </div>
      <button
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium self-start"
        style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
      >
        <Download size={16} color="#10B981" />
        <span>خروجی اکسل</span>
      </button>
    </div>
  );
}

function PerformanceBarChart() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">میانگین ارزیابی عملکرد به تفکیک درس</h3>
      {TEACHER_PERFORMANCE_BARS.length === 0 ? (
        <EmptyDataMessage className="py-12" />
      ) : (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={TEACHER_PERFORMANCE_BARS} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}`, 'میانگین']}
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
            {TEACHER_PERFORMANCE_BARS.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 10, fontWeight: 700, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
      <div className="flex flex-wrap items-center gap-4 mt-2 pt-3 border-t border-gray-100">
        {[
          { label: 'عالی (بالای ۴.۵)', color: '#10B981' },
          { label: 'متوسط (۳.۵-۴.۵)', color: '#F59E0B' },
          { label: 'نیاز به بهبود (زیر ۳.۵)', color: '#EF4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectDistributionChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع معلمان بر اساس درس</h3>
      {SUBJECT_TEACHER_DISTRIBUTION.length === 0 ? (
        <EmptyDataMessage className="py-12" />
      ) : (
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={150} height={150}>
            <Pie
              data={SUBJECT_TEACHER_DISTRIBUTION}
              cx={70}
              cy={70}
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {SUBJECT_TEACHER_DISTRIBUTION.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-500">مجموع معلمان</span>
            <span className="text-lg font-bold text-gray-900">۰</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {SUBJECT_TEACHER_DISTRIBUTION.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
              <span className="text-xs font-semibold text-gray-800">({item.value}٪)</span>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

function WorkforceSummaryCard() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">خلاصه کادر آموزشی</h3>
      <div className="flex flex-col gap-3">
        {WORKFORCE_SUMMARY.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: item.bg }}
            >
              <SummaryIcon type={item.icon} color={item.color} />
            </div>
            <span className="text-sm text-gray-600 flex-1">{item.label}</span>
            <span className="text-sm font-bold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceBar({ rate }) {
  const color = rate >= 90 ? '#10B981' : rate >= 80 ? '#14B8A6' : '#F59E0B';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
        <div className="h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-left">{formatAttendance(rate)}</span>
    </div>
  );
}

function TeachersTable({ compact }) {
  return (
    <div className="rounded-3xl p-5 overflow-hidden" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">لیست معلمان</h3>
      <div className={compact ? 'overflow-x-auto' : ''}>
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['کد', 'نام معلم', 'درس تخصصی', 'کلاس', 'دانش‌آموز', 'ارزیابی', 'حضور', ''].map((col, i) => (
                <th key={i} className="text-xs text-gray-400 font-medium text-right pb-3 px-2 first:pr-0 last:pl-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEACHERS_TABLE.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyDataMessage />
                </td>
              </tr>
            ) : (
            TEACHERS_TABLE.map((row) => (
              <tr key={row.code} className="border-b border-gray-50 last:border-0">
                <td className="py-3.5 px-2 first:pr-0 text-xs font-medium text-gray-500">{row.code}</td>
                <td className="py-3.5 px-2 text-sm font-semibold text-gray-900">{row.name}</td>
                <td className="py-3.5 px-2 text-sm text-gray-600">{row.subject}</td>
                <td className="py-3.5 px-2 text-sm text-gray-700 text-center">{formatCount(row.classes)}</td>
                <td className="py-3.5 px-2 text-sm text-gray-700 text-center">{formatCount(row.students)}</td>
                <td className="py-3.5 px-2">
                  <div className="flex items-center gap-1">
                    <Star size={12} fill={getRatingColor(row.rating)} color={getRatingColor(row.rating)} />
                    <span className="text-sm font-bold" style={{ color: getRatingColor(row.rating) }}>
                      {formatRating(row.rating)}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-2">
                  <AttendanceBar rate={row.attendance} />
                </td>
                <td className="py-3.5 px-2 last:pl-0">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100">
                    <MoreHorizontal size={16} color="#9CA3AF" />
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">نمایش ۰ از ۰ ردیف</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
          {[1, 2, 3, '...', 6].map((page, i) => (
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
    </div>
  );
}

function TopTeachersWidget() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">برترین معلمان (ارزیابی عملکرد)</h3>
      <div className="flex flex-col gap-4">
        {TOP_TEACHERS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        TOP_TEACHERS.map((item) => (
          <div key={item.rank} className="flex items-center gap-3">
            <span className="text-lg">{item.medal}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.subject}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star size={14} fill="#F59E0B" color="#F59E0B" />
              <span className="text-sm font-bold text-amber-600">{formatRating(item.rating)}</span>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

function AttentionNeededWidget() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">معلمان نیازمند توجه</h3>
      <div className="flex flex-col gap-3">
        {TEACHERS_NEEDING_ATTENTION.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        TEACHERS_NEEDING_ATTENTION.map((item) => {
          const isDanger = item.variant === 'danger';
          return (
            <div
              key={item.name}
              className="flex items-start gap-3 p-3 rounded-2xl"
              style={{ background: isDanger ? '#FEF2F2' : '#FFFBEB' }}
            >
              <AlertTriangle size={16} color={isDanger ? '#EF4444' : '#F59E0B'} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: isDanger ? '#EF4444' : '#D97706' }}>
                  {item.issue}
                </p>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}

function RecentActivitiesWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">فعالیت‌های اخیر معلمان</h3>
      <div className="flex flex-col gap-4 flex-1">
        {RECENT_TEACHER_ACTIVITIES.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        RECENT_TEACHER_ACTIVITIES.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: item.bg }}
              >
                <ActivityIcon type={item.icon} color={item.color} />
              </div>
              {i < RECENT_TEACHER_ACTIVITIES.length - 1 && (
                <div className="w-px flex-1 mt-1" style={{ background: '#E5E7EB', minHeight: 16 }} />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm text-gray-800 leading-snug">{item.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه فعالیت‌ها</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function FooterKpiCards({ compact }) {
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
      {TEACHERS_FOOTER_KPIS.map((item) => (
        <div key={item.title} className="rounded-3xl p-4 flex items-center gap-3" style={CARD_STYLE}>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: item.iconBg }}
          >
            <FooterKpiIcon type={item.icon} color={item.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500 font-medium truncate">{item.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp size={10} color="#10B981" />
              <span className="text-xs font-medium text-emerald-500">{item.trend}</span>
              <span className="text-xs text-gray-400 hidden sm:inline">نسبت به ماه قبل</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeachersBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <TeachersPageHeader compact={compact} />
      <TeachersFiltersRow compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <WorkforceSummaryCard />
        <SubjectDistributionChart />
        <PerformanceBarChart />
      </div>

      <TeachersTable compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <RecentActivitiesWidget />
        <AttentionNeededWidget />
        <TopTeachersWidget />
      </div>

      <FooterKpiCards compact={compact} />

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function TeachersDesktop() {
  return (
    <DesktopPageShell>
      <TeachersBody />
    </DesktopPageShell>
  );
}

export function TeachersMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <TeachersBody compact />
    </MobilePageShell>
  );
}
