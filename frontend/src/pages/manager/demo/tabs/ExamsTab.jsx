import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
} from 'recharts';
import {
  Plus, FileText, TrendingUp, AlertTriangle, MoreHorizontal,
  ChevronLeft, BarChart2, Pencil, Sparkles, TrendingDown, Lightbulb,
  Calculator, FlaskConical, Languages, BookOpen,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE, EmptyDataMessage } from '../components/DemoUi';
import {
  EXAM_SUMMARY_STATS,
  SPARKLINE_DATA,
  MINI_BAR_DATA,
  CURRENT_EXAMS,
  EXAM_STATUS_CONFIG,
  UPCOMING_EXAMS,
  PERFORMANCE_TREND,
  CHART_TABS,
  SUBJECT_WEAKNESS,
  GRADE_DISTRIBUTION,
  SMART_INSIGHTS,
  EXAM_CARDS,
  TOP_STUDENTS_RANKING,
} from '../data/examsMockData';

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

function SubjectIcon({ type, color }) {
  const props = { size: 20, color };
  switch (type) {
    case 'math': return <Calculator {...props} />;
    case 'science': return <FlaskConical {...props} />;
    case 'english': return <Languages {...props} />;
    case 'literature': return <BookOpen {...props} />;
    default: return <FileText {...props} />;
  }
}

function InsightIcon({ type, color }) {
  const props = { size: 16, color };
  switch (type) {
    case 'down': return <TrendingDown {...props} />;
    case 'up': return <TrendingUp {...props} />;
    case 'idea': return <Lightbulb {...props} />;
    default: return <Sparkles {...props} />;
  }
}

function CircularProgress({ percent, color = '#10B981' }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="64" height="64" className="flex-shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#F3F4F6" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function SummaryStatCard({ stat }) {
  return (
    <div className="rounded-3xl p-4 flex flex-col gap-2" style={CARD_STYLE}>
      <span className="text-xs font-medium text-gray-500">{stat.title}</span>
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-2xl font-bold"
          style={{ color: stat.type === 'warning' ? '#EF4444' : '#111827' }}
        >
          {stat.value}
        </span>
        {stat.type === 'progress' && (
          <div className="relative flex items-center justify-center">
            <CircularProgress percent={stat.progress} />
          </div>
        )}
        {stat.type === 'sparkline' && (
          <ResponsiveContainer width={64} height={32}>
            <AreaChart data={SPARKLINE_DATA} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="v" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {stat.type === 'miniBar' && (
          <ResponsiveContainer width={64} height={32}>
            <BarChart data={MINI_BAR_DATA} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="v" fill="#10B981" radius={[2, 2, 0, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {stat.type === 'warning' && (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: stat.iconBg }}
          >
            <AlertTriangle size={22} color={stat.iconColor} />
          </div>
        )}
      </div>
      {stat.subtext && (
        <span
          className="text-xs font-medium"
          style={{ color: stat.type === 'warning' ? '#EF4444' : '#6B7280' }}
        >
          {stat.subtext}
        </span>
      )}
      {stat.trend && (
        <div className="flex items-center gap-1">
          <TrendingUp size={12} color="#10B981" />
          <span className="text-xs font-medium text-emerald-500">{stat.trend}</span>
          <span className="text-xs text-gray-400">{stat.trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function ExamsPageHeader({ compact }) {
  return (
    <div className={`flex ${compact ? 'flex-col gap-4' : 'items-start justify-between gap-4'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#EDE9FE' }}
        >
          <FileText size={22} color="#8B5CF6" />
        </div>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>مدیریت آزمون‌ها</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            نمای کلی و تحلیل عملکرد آزمون‌های مدرسه
          </p>
        </div>
      </div>
      <button
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white ${compact ? 'self-start' : ''}`}
        style={{ background: '#10B981' }}
      >
        <Plus size={16} />
        <span>ایجاد آزمون جدید</span>
      </button>
    </div>
  );
}

function CurrentExamsSection() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">آزمون‌های جاری</h3>
      <div className="flex flex-col gap-4">
        {CURRENT_EXAMS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        CURRENT_EXAMS.map((exam) => {
          const statusCfg = EXAM_STATUS_CONFIG[exam.status];
          return (
            <div
              key={exam.id}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: exam.iconBg }}
              >
                <SubjectIcon type={exam.icon} color={exam.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{exam.title}</p>
                  <span className="text-xs text-gray-500">{exam.grade}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{exam.detail}</p>
                {exam.status !== 'published' && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${exam.progress}%`,
                        background: exam.status === 'grading' ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                )}
              </div>
              {exam.status === 'published' ? (
                <button
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: '#10B981' }}
                >
                  مشاهده تحلیل
                </button>
              ) : (
                <button className="p-2 rounded-xl hover:bg-white flex-shrink-0">
                  <MoreHorizontal size={18} color="#9CA3AF" />
                </button>
              )}
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}

function UpcomingExamsWidget() {
  return (
    <div className="rounded-3xl p-5 h-full" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">آزمون‌های آینده</h3>
      <div className="flex flex-col gap-3">
        {UPCOMING_EXAMS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        UPCOMING_EXAMS.map((exam, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-12 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ background: '#D1FAE5' }}
            >
              <span className="text-lg font-bold text-emerald-700">{exam.day}</span>
              <span className="text-xs text-emerald-600">{exam.month}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{exam.title}</p>
              <p className="text-xs text-gray-500">{exam.grade}</p>
            </div>
            <span className="text-xs font-medium text-gray-600 dir-ltr">{exam.time}</span>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

function PerformanceTrendChart({ compact }) {
  const [activeTab, setActiveTab] = useState('score');
  const dataKey = CHART_TABS.find((t) => t.id === activeTab)?.key || 'score';

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between'} mb-4`}>
        <h3 className="font-bold text-gray-900 text-sm">عملکرد آزمون‌ها در ۶ ماه اخیر</h3>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
          {CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? '#10B981' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#6B7280',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={PERFORMANCE_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[60, 100]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            formatter={(value) => [value, CHART_TABS.find((t) => t.id === activeTab)?.label]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
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

function SubjectWeaknessChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">نقاط ضعف درسی</h3>
      <div className="flex flex-col gap-4">
        {SUBJECT_WEAKNESS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        SUBJECT_WEAKNESS.map((item) => (
          <div key={item.subject}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{item.subject}</span>
              <span className="text-sm font-bold" style={{ color: item.color }}>{item.rate}٪</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${item.rate}%`, background: item.color }}
              />
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

function GradeDistributionChart() {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">توزیع نمرات</h3>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <PieChart width={140} height={140}>
            <Pie
              data={GRADE_DISTRIBUTION}
              cx={65}
              cy={65}
              innerRadius={45}
              outerRadius={62}
              dataKey="value"
              labelLine={false}
              label={renderDonutLabel}
            >
              {GRADE_DISTRIBUTION.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {GRADE_DISTRIBUTION.map((item) => (
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

function SmartAnalysisWidget() {
  return (
    <div className="rounded-3xl p-5 h-full" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} color="#8B5CF6" />
        <h3 className="font-bold text-gray-900 text-sm">تحلیل هوشمند آزمون‌ها</h3>
      </div>
      <div className="flex flex-col gap-3">
        {SMART_INSIGHTS.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        SMART_INSIGHTS.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-2xl"
            style={{ background: item.bg }}
          >
            <InsightIcon type={item.icon} color={item.color} />
            <p className="text-sm text-gray-800 leading-snug">{item.text}</p>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

function ExamSubjectCard({ card }) {
  return (
    <div className="rounded-3xl p-4 flex flex-col gap-3" style={CARD_STYLE}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: card.iconBg }}
        >
          <SubjectIcon type={card.icon} color={card.iconColor} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{card.subject}</p>
          <p className="text-xs text-gray-500">{card.grade}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl" style={{ background: '#F9FAFB' }}>
          <p className="text-sm font-bold text-gray-900">{card.participation}٪</p>
          <p className="text-xs text-gray-500">مشارکت</p>
        </div>
        <div className="p-2 rounded-xl" style={{ background: '#F9FAFB' }}>
          <p className="text-sm font-bold text-gray-900">{card.average}</p>
          <p className="text-xs text-gray-500">میانگین</p>
        </div>
        <div className="p-2 rounded-xl" style={{ background: '#F9FAFB' }}>
          <p className="text-sm font-bold text-gray-900">{card.count}</p>
          <p className="text-xs text-gray-500">شرکت‌کننده</p>
        </div>
      </div>
      <div className="flex items-center justify-around pt-2 border-t border-gray-100">
        {[
          { icon: BarChart2, label: 'تحلیل' },
          { icon: Pencil, label: 'ویرایش' },
          { icon: FileText, label: 'نتایج' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50">
            <Icon size={16} color="#6B7280" />
            <span className="text-xs text-gray-500">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentRankingWidget() {
  return (
    <div className="rounded-3xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-4">رتبه‌بندی دانش‌آموزان</h3>
      <div className="flex flex-col gap-4 flex-1">
        {TOP_STUDENTS_RANKING.length === 0 ? (
          <EmptyDataMessage />
        ) : (
        TOP_STUDENTS_RANKING.map((s) => (
          <div key={s.rank} className="flex items-center gap-3">
            <span className="text-xl">{s.medal}</span>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: s.color }}
            >
              {s.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-500">{s.grade}</p>
            </div>
            <span className="text-sm font-bold text-emerald-600">{s.score}</span>
          </div>
        ))
        )}
      </div>
      <button className="flex items-center gap-1 text-xs font-semibold mt-4" style={{ color: '#10B981' }}>
        <span>لیست کامل رتبه‌بندی</span>
        <ChevronLeft size={14} />
      </button>
    </div>
  );
}

function ExamsBody({ compact }) {
  const spacing = compact ? 'space-y-5' : 'space-y-6';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <ExamsPageHeader compact={compact} />

      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {EXAM_SUMMARY_STATS.map((stat) => (
          <SummaryStatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <CurrentExamsSection />

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <UpcomingExamsWidget />
        <PerformanceTrendChart compact={compact} />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <SmartAnalysisWidget />
        <GradeDistributionChart />
        <SubjectWeaknessChart />
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-12'}`}>
        <div className={compact ? '' : 'col-span-4'}>
          <StudentRankingWidget />
        </div>
        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'col-span-8 grid-cols-2'}`}>
          {EXAM_CARDS.length === 0 ? (
            <div className={compact ? 'col-span-2' : 'col-span-2'}>
              <div className="rounded-3xl p-8" style={CARD_STYLE}>
                <EmptyDataMessage />
              </div>
            </div>
          ) : (
          EXAM_CARDS.map((card) => (
            <ExamSubjectCard key={card.subject + card.grade} card={card} />
          ))
          )}
        </div>
      </div>

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function ExamsDesktop() {
  return (
    <DesktopPageShell>
      <ExamsBody />
    </DesktopPageShell>
  );
}

export function ExamsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <ExamsBody compact />
    </MobilePageShell>
  );
}
