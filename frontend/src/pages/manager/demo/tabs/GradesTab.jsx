import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, FileText, ChevronDown, TrendingUp, AlertTriangle, Award,
  ChevronLeft, Sparkles, Lightbulb, BarChart2,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE, EmptyDataMessage } from '../components/DemoUi';
import {
  GRADES_SUMMARY_STATS,
  SPARKLINE_TREND,
  GRADE_FILTERS,
  HEATMAP_GRADES,
  HEATMAP_SUBJECTS,
  HEATMAP_DATA,
  getHeatmapColor,
  SCHOOL_AVERAGE_TREND,
  PERFORMANCE_DISTRIBUTION,
  CLASS_RANKINGS,
  TEACHER_RANKINGS,
  SUBJECT_DIFFICULTY,
  STUDENTS_AT_RISK,
  SMART_ANALYSIS,
  formatScore,
} from '../data/gradesMockData';

function FilterDropdown({ label }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium flex-1 min-w-[120px]"
      style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
    >
      <span className="truncate">{label}</span>
      <ChevronDown size={14} color="#9CA3AF" className="flex-shrink-0" />
    </button>
  );
}

function SummaryStatCard({ stat }) {
  return (
    <div className="rounded-3xl p-4 flex flex-col gap-2" style={CARD_STYLE}>
      <span className="text-xs font-medium text-gray-500">{stat.title}</span>
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
          {stat.unit && <span className="text-xs text-gray-400 mr-1">{stat.unit}</span>}
        </div>
        {stat.type === 'sparkline' && (
          <ResponsiveContainer width={56} height={28}>
            <AreaChart data={SPARKLINE_TREND} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="v" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {stat.type === 'warning' && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.iconBg }}>
            <AlertTriangle size={18} color={stat.iconColor} />
          </div>
        )}
        {stat.type === 'excellent' && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.iconBg }}>
            <Award size={18} color={stat.iconColor} />
          </div>
        )}
        {stat.type === 'growth' && (
          <TrendingUp size={24} color="#10B981" />
        )}
      </div>
      {stat.type === 'hardest' && (
        <>
          <span className="text-xs text-gray-500">{stat.subtext}</span>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
            <div className="h-full rounded-full" style={{ width: `${stat.progress}%`, background: '#3B82F6' }} />
          </div>
        </>
      )}
      {stat.subtext && stat.type !== 'hardest' && (
        <span className="text-xs text-gray-500">{stat.subtext}</span>
      )}
      {stat.trend && stat.type === 'sparkline' && (
        <div className="flex items-center gap-1">
          <TrendingUp size={12} color="#10B981" />
          <span className="text-xs font-medium text-emerald-500">{stat.trend}</span>
          <span className="text-xs text-gray-400">{stat.trendLabel}</span>
        </div>
      )}
      {stat.trend && stat.type === 'growth' && (
        <span className="text-xs font-semibold text-emerald-500">{stat.trend}</span>
      )}
    </div>
  );
}

function GradesPageHeader({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#FEF3C7' }}
        >
          <BarChart2 size={22} color="#F59E0B" />
        </div>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>نمرات دانش‌آموزان</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            تحلیل عملکرد آموزشی مدرسه
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-shrink-0'}`}>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <FileText size={16} color="#6B7280" />
          <span>گزارش PDF</span>
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: '#fff', border: '1px solid #10B981', color: '#10B981' }}
        >
          <Download size={16} color="#10B981" />
          <span>خروجی اکسل</span>
        </button>
      </div>
    </div>
  );
}

function GradesFiltersRow({ compact }) {
  return (
    <div className={`flex gap-2 ${compact ? 'flex-wrap' : ''}`}>
      {GRADE_FILTERS.map((label) => (
        <FilterDropdown key={label} label={label} />
      ))}
    </div>
  );
}

function PerformanceHeatmap() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">عملکرد پایه‌ها در دروس</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px]">
          <thead>
            <tr>
              <th className="text-xs text-gray-400 font-medium text-right pb-2 pr-0 pl-2">پایه</th>
              {HEATMAP_SUBJECTS.map((s) => (
                <th key={s} className="text-xs text-gray-400 font-medium text-center pb-2 px-1">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_GRADES.map((grade) => (
              <tr key={grade}>
                <td className="text-xs font-medium text-gray-600 py-2 pr-0 pl-2">{grade}</td>
                {HEATMAP_SUBJECTS.map((subject) => {
                  const score = HEATMAP_DATA[grade][subject];
                  const { bg, color } = getHeatmapColor(score);
                  return (
                    <td key={subject} className="p-1">
                      <div
                        className="rounded-lg py-2 text-center text-xs font-bold"
                        style={{ background: bg, color }}
                      >
                        {formatScore(score)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchoolAverageTrendChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">روند میانگین نمرات مدرسه</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={SCHOOL_AVERAGE_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradesTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={1} />
          <YAxis domain={[75, 90]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            formatter={(value) => [value, 'میانگین']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#gradesTrendGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerformanceDistributionChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع دانش‌آموزان بر اساس عملکرد</h3>
      <div className="flex flex-col gap-4">
        {PERFORMANCE_DISTRIBUTION.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold" style={{ color: item.color }}>{item.percent}٪</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${item.percent}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassRankingsWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">رتبه‌بندی کلاس‌ها</h3>
      <div className="flex flex-col gap-3 flex-1">
        {CLASS_RANKINGS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        CLASS_RANKINGS.map((item) => (
          <div key={item.rank} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm">{item.medal}</span>
            <span className="text-sm font-medium text-gray-900 flex-1 truncate">{item.name}</span>
            <span className="text-sm font-bold text-emerald-600">{formatScore(item.score)}</span>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه کلاس‌ها</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function TeacherRankingsWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">رتبه‌بندی معلمان</h3>
      <div className="flex flex-col gap-4 flex-1">
        {TEACHER_RANKINGS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        TEACHER_RANKINGS.map((t) => (
          <div key={t.name} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: t.color }}
            >
              {t.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
              <p className="text-xs text-gray-500">{t.subject}</p>
            </div>
            <span className="text-sm font-bold text-gray-800">{formatScore(t.score)}</span>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه معلمان</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function SubjectDifficultyWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">سختی درس‌ها</h3>
      <div className="flex flex-col gap-3 flex-1">
        {SUBJECT_DIFFICULTY.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        SUBJECT_DIFFICULTY.map((item) => (
          <div key={item.subject} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-20 flex-shrink-0 truncate">{item.subject}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${item.score}%`, background: item.color }}
              />
            </div>
            <span className="text-xs font-bold w-8 text-left" style={{ color: item.color }}>
              {formatScore(item.score)}
            </span>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>جزئیات بیشتر</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function StudentsAtRiskWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">دانش‌آموزان در معرض افت تحصیلی</h3>
      <div className="flex flex-col gap-3 flex-1">
        {STUDENTS_AT_RISK.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        STUDENTS_AT_RISK.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: s.color }}
            >
              {s.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
              <p className="text-xs text-gray-500">{s.grade}</p>
            </div>
            <span className="text-sm font-bold text-red-500">-{formatScore(s.drop)}٪</span>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده همه</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function SmartAnalysisWidget() {
  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} color="#8B5CF6" />
        <h3 className="font-bold text-gray-900 text-sm">تحلیل هوشمند</h3>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed flex-1">{SMART_ANALYSIS.summary}</p>
      {SMART_ANALYSIS.suggestion ? (
      <div
        className="flex items-start gap-2 p-3 rounded-2xl mt-4"
        style={{ background: '#DBEAFE' }}
      >
        <Lightbulb size={16} color="#3B82F6" className="flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">{SMART_ANALYSIS.suggestion}</p>
      </div>
      ) : null}
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>مشاهده پیشنهادها</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function GradesBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <GradesPageHeader compact={compact} />
      <GradesFiltersRow compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {GRADES_SUMMARY_STATS.map((stat) => (
          <SummaryStatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <PerformanceDistributionChart />
        <SchoolAverageTrendChart />
        <PerformanceHeatmap />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-5'}`}>
        <SmartAnalysisWidget />
        <StudentsAtRiskWidget />
        <SubjectDifficultyWidget />
        <TeacherRankingsWidget />
        <ClassRankingsWidget />
      </div>

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function GradesDesktop() {
  return (
    <DesktopPageShell>
      <GradesBody />
    </DesktopPageShell>
  );
}

export function GradesMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <GradesBody compact />
    </MobilePageShell>
  );
}
