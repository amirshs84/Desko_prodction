import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '../components/BottomNav';
import SubjectDonutChart from '../components/SubjectDonutChart';
import { WeeklyGoalPopup } from '../calendar/components/WeeklyGoalPopup';
import { useSessions, useSubjects } from '../hooks/useDataQueries';
import { formatRelativeDateIran, getStartOfDayIran, getIranDate } from '../utils/dateUtils';
import { isDevAuthBypass } from '../utils/devAuth';
/* ─────────────────────────── کامپوننت‌های وضعیت ─────────────────────────── */

/** اسکلت لودینگ — فقط محتوای داخلی، نه کل صفحه */
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* هدر */}
      <div className="flex justify-between items-center">
        <div className="h-10 w-36 bg-panel rounded-xl" />
        <div className="h-11 w-36 bg-panel rounded-lg" />
      </div>
      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card p-6 rounded-xl border border-edge">
            <div className="h-4 w-28 bg-panel rounded mb-3" />
            <div className="h-9 w-20 bg-panel rounded" />
          </div>
        ))}
      </div>
      {/* هیت‌مپ placeholder */}
      <div className="bg-card p-6 rounded-xl border border-edge h-52" />
      {/* موضوعات placeholder */}
      <div className="bg-card p-6 rounded-xl border border-edge h-40" />
    </div>
  );
}

/** بنر داده‌ی قدیمی در حال به‌روزرسانی */
function StaleBanner({ onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3
                    bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-amber-400">
        <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>در حال به‌روزرسانی اطلاعات…</span>
      </div>
    </div>
  );
}

/** بنر خطای شبکه — وقتی هیچ داده‌ای نداریم */
function ErrorBanner({ error, onRetry }) {
  const isOffline = !navigator.onLine;
  const isServer  = error?.response?.status >= 500;

  const message = isOffline
    ? 'اتصال به اینترنت برقرار نیست.'
    : isServer
    ? 'خطای سرور. لطفاً دوباره تلاش کنید.'
    : 'خطا در دریافت اطلاعات.';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="text-5xl">📡</div>
      <p className="text-ink-2 font-semibold text-lg">{message}</p>
      <p className="text-ink-4 text-sm max-w-xs">
        {isOffline
          ? 'پس از اتصال مجدد، اطلاعات به‌طور خودکار به‌روز می‌شوند.'
          : 'مشکل موقتی است. دوباره امتحان کنید.'}
      </p>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg
                   font-semibold transition text-sm active:scale-95">
        تلاش مجدد
      </button>
    </div>
  );
}

/** بنر داده‌ی قدیمی + خطا — وقتی cache داریم ولی fetch جدید fail شده */
function StaleErrorBanner({ onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3
                    bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-red-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>اطلاعات به‌روز نیست — داده‌های ذخیره‌شده نمایش داده می‌شود</span>
      </div>
      <button
        onClick={onRetry}
        className="flex-shrink-0 px-3 py-1 bg-red-500/20 hover:bg-red-500/30
                   border border-red-500/40 rounded-lg transition text-red-300 text-xs
                   active:scale-95">
        تلاش مجدد
      </button>
    </div>
  );
}

/* ─────────────────────────── کارت آمار انیمیشن‌دار ─────────────────────────── */

const cardItemVariants = {
  hidden:  { opacity: 0, y: 8,  scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const cardGroupVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
  exit:    { transition: { staggerChildren: 0.06 } },
};

/* ─────────────────────────── کامپوننت اصلی ─────────────────────────── */

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('weekly');
  const [statsSetIndex, setStatsSetIndex] = useState(0);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    if (!isDevAuthBypass() && !localStorage.getItem('isLoggedIn')) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHoveredRef.current) {
        setStatsSetIndex((prev) => (prev === 0 ? 1 : 0));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: studySessions = [],
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
    isError: sessionsError,
    dataUpdatedAt: sessionsUpdatedAt,
    error: sessionsErrorObj,
    refetch: refetchSessions,
  } = useSessions();

  const {
    data: courses = [],
    isLoading: coursesLoading,
    isFetching: coursesFetching,
    isError: coursesError,
    refetch: refetchCourses,
  } = useSubjects();

  const refetchAll = () => {
    refetchSessions();
    refetchCourses();
  };

  // داریم برای اولین بار لود می‌کنیم و هیچ cache‌ای نداریم
  const isInitialLoading = (sessionsLoading || coursesLoading);
  // در حال fetch در پس‌زمینه (cache موجود است)
  const isFetchingBackground = !isInitialLoading && (sessionsFetching || coursesFetching);
  // خطای کامل: fetch جلسات fail شده و هنوز هیچ پاسخ موفقی (حتی []) دریافت نشده
  const isFatalError = sessionsError && studySessions.length === 0 && sessionsUpdatedAt === 0;
  // fetch fail شد ولی cache داریم (sessions یا subjects)
  const hasStaleError = (sessionsError && studySessions.length > 0) || (coursesError && courses.length > 0);

  /* ── توابع کمکی ── */
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${Math.floor(seconds / 60)}m`;
  };

  const getTotalStudyTime = (sessions = studySessions) =>
    sessions.reduce((total, s) => total + s.duration_seconds, 0);

  const getSubjectData = (sessions = studySessions) => {
    const totals = {};
    sessions.forEach((s) => {
      totals[s.subject_name] = (totals[s.subject_name] || 0) + s.duration_seconds;
    });
    const total = getTotalStudyTime(sessions);
    return Object.entries(totals).map(([subject, duration]) => ({
      subject,
      duration,
      percentage: total > 0 ? Math.round((duration / total) * 100) : 0,
    }));
  };

  const getSubjectColor = (subjectName) => {
    const course = courses.find((c) => c.name === subjectName);
    return course?.color_code || '#3b82f6';
  };

  const getHeatmapData = () => {
    const today = getStartOfDayIran();
    return Array.from({ length: 90 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (89 - i));
      const dateStr = date.toLocaleDateString('en-CA');
      const daySessions = studySessions.filter((session) => {
        const d = getIranDate(session.start_time);
        return d.toLocaleDateString('en-CA') === dateStr;
      });
      return {
        date: dateStr,
        dayOfWeek: (date.getDay() + 1) % 7,
        totalMinutes: Math.floor(getTotalStudyTime(daySessions) / 60),
        sessions: daySessions.length,
      };
    });
  };

  const getHeatmapColor = (minutes) => {
    if (minutes === 0)   return 'bg-panel';
    if (minutes < 30)    return 'bg-emerald-900/50';
    if (minutes < 60)    return 'bg-emerald-700/70';
    if (minutes < 120)   return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const getFilteredSessions = () => {
    if (activeTab === 'daily') {
      const today = getStartOfDayIran();
      return studySessions.filter((s) => getIranDate(s.start_time) >= today);
    }
    if (activeTab === 'weekly') {
      const weekAgo = getStartOfDayIran();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return studySessions.filter((s) => getIranDate(s.start_time) >= weekAgo);
    }
    const monthAgo = getStartOfDayIran();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return studySessions.filter((s) => getIranDate(s.start_time) >= monthAgo);
  };

  const tabClass = (tab) =>
    `px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
      activeTab === tab
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
        : 'bg-panel text-ink-3 hover:bg-panel-hover'
    }`;

  /* ─────────────────────────── JSX ─────────────────────────── */

  // layout اصلی همیشه رندر می‌شود تا BottomNav همیشه نمایش داشته باشد
  return (
    <div className="h-full flex flex-col bg-bg text-ink">
      <WeeklyGoalPopup />
      <div className="flex-1 overflow-y-auto overscroll-none p-4 md:p-8 pb-nav-safe">
        <div className="max-w-6xl mx-auto">

          {/* هدر — همیشه نمایش داده می‌شود */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center
                          gap-4 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400
                           to-purple-500 bg-clip-text text-transparent pb-2">
              پیشرفت
            </h1>
            <button onClick={() => navigate('/timer')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg
                         hover:from-emerald-600 hover:to-teal-700 transition font-semibold
                         shadow-lg shadow-emerald-500/30">
              شروع پیشروی
            </button>
          </div>

          {/* ── وضعیت‌های مختلف محتوا ── */}

          {/* لودینگ اولیه — بدون هیچ cache */}
          {isInitialLoading && <DashboardSkeleton />}

          {/* خطای کامل — هیچ داده‌ای نداریم */}
          {!isInitialLoading && isFatalError && (
            <ErrorBanner error={sessionsErrorObj} onRetry={refetchAll} />
          )}

          {/* داده موجود است */}
          {!isInitialLoading && !isFatalError && (
            <>
              {/* بنر به‌روزرسانی در پس‌زمینه */}
              {isFetchingBackground && !hasStaleError && (
                <StaleBanner onRetry={refetchAll} />
              )}

              {/* بنر خطا روی داده قدیمی */}
              {hasStaleError && (
                <StaleErrorBanner onRetry={refetchAll} />
              )}

              {/* حالت خالی — داده واقعاً وجود ندارد */}
              {studySessions.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl md:text-8xl mb-6">📊</div>
                  <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-ink-2">
                    هنوز داده‌ای برای نمایش وجود ندارد
                  </h2>
                  <p className="text-ink-4 mb-8 max-w-md mx-auto">
                    اولین پیشروی خود را شروع کنید تا پیشرفت و آمار خود را در اینجا مشاهده کنید!
                  </p>
                  <button onClick={() => navigate('/timer')}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg
                               hover:from-emerald-600 hover:to-teal-700 transition font-semibold
                               text-lg shadow-lg shadow-emerald-500/30">
                    همین حالا پیشروی را شروع کنید
                  </button>
                </div>
              )}

              {/* محتوای اصلی داشبورد */}
              {studySessions.length > 0 && (() => {
                const filteredSessions = getFilteredSessions();
                const heatmapData = getHeatmapData();
                return (
                  <>
                    {/* تب‌ها */}
                    <div className="flex gap-2 mb-6 overflow-x-auto">
                      <button onClick={() => setActiveTab('daily')}  className={tabClass('daily')}>روزانه</button>
                      <button onClick={() => setActiveTab('weekly')} className={tabClass('weekly')}>هفتگی</button>
                      <button onClick={() => setActiveTab('monthly')} className={tabClass('monthly')}>ماهانه</button>
                    </div>

                    {/* کارت‌های آمار — انیمیشن‌دار */}
                    {(() => {
                      const totalSeconds = getTotalStudyTime(filteredSessions);
                      const sessionCount = filteredSessions.length;
                      const uniqueSubjectCount = getSubjectData(filteredSessions).length;
                      const xp = Math.floor(totalSeconds / 60);
                      const avgFocus = sessionCount > 0
                        ? formatDuration(Math.floor(totalSeconds / sessionCount))
                        : '—';
                      const explorerPct = courses.length > 0
                        ? `${Math.round((uniqueSubjectCount / courses.length) * 100)}٪`
                        : '—';

                      const sets = [
                        [
                          { label: 'مجموع زمان پیشروی', value: formatDuration(totalSeconds), accent: '#60a5fa' },
                          { label: 'جلسات تکمیل شده',   value: sessionCount,                  accent: '#c084fc' },
                          { label: 'موضوعات پیشروی شده', value: uniqueSubjectCount,            accent: '#4ade80' },
                        ],
                        [
                          { label: 'XP کسب‌شده',    value: `${xp.toLocaleString('fa-IR')} ✦`, accent: '#f59e0b' },
                          { label: 'میانگین تمرکز', value: avgFocus,                            accent: '#38bdf8' },
                          { label: 'کاوشگر دروس',   value: explorerPct,                         accent: '#a78bfa' },
                        ],
                      ];
                      const currentSet = sets[statsSetIndex];

                      return (
                        <div
                          className="mb-8"
                          onMouseEnter={() => { isHoveredRef.current = true; }}
                          onMouseLeave={() => { isHoveredRef.current = false; }}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                              key={statsSetIndex}
                              className="grid grid-cols-1 md:grid-cols-3 gap-4"
                              variants={cardGroupVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              {currentSet.map((card, i) => (
                                <motion.div
                                  key={i}
                                  variants={cardItemVariants}
                                  className="relative bg-card p-6 rounded-xl border border-edge overflow-hidden"
                                >
                                  <div
                                    className="absolute inset-0 pointer-events-none rounded-xl"
                                    style={{
                                      background: `radial-gradient(ellipse at 50% 0%, ${card.accent}12 0%, transparent 70%)`,
                                    }}
                                  />
                                  <div className="text-ink-3 text-sm mb-2 relative z-10">{card.label}</div>
                                  <div className="text-3xl font-bold relative z-10" style={{ color: card.accent }}>
                                    {card.value}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          </AnimatePresence>

                          {/* indicator dots */}
                          <div className="flex justify-center gap-2 mt-3">
                            {[0, 1].map((idx) => (
                              <button
                                key={idx}
                                onClick={() => setStatsSetIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  statsSetIndex === idx
                                    ? 'bg-blue-400 w-4'
                                    : 'w-1.5 bg-ink-4 hover:bg-ink-3'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* هیت‌مپ + دونات چارت — layout ریسپانسیو */}
                    <div className="flex flex-col lg:flex-row-reverse gap-6 mb-8 items-start">

                      {/* هیت‌مپ — بالا در موبایل، راست در دسکتاپ */}
                      <div className="bg-card p-4 md:p-6 rounded-xl border border-edge flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row items-center md:justify-between mb-6">
                          <h2 className="text-xl md:text-2xl font-semibold text-ink-2 text-center
                                         md:text-right w-full md:w-auto">
                            فعالیت ۹۰ روز گذشته
                          </h2>
                          <div className="hidden md:flex items-center gap-2 text-xs text-ink-3">
                            <span>کمتر</span>
                            <div className="flex gap-1">
                              <div className="w-4 h-4 bg-panel rounded-sm" />
                              <div className="w-4 h-4 bg-emerald-900/50 rounded-sm" />
                              <div className="w-4 h-4 bg-emerald-700/70 rounded-sm" />
                              <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                              <div className="w-4 h-4 bg-emerald-400 rounded-sm" />
                            </div>
                            <span>بیشتر</span>
                          </div>
                        </div>

                        <div className="flex justify-center w-full">
                          <div className="inline-flex gap-2">
                            <div className="flex flex-col justify-around text-xs text-ink-4 py-4 pl-2 h-[140px]">
                              <div>شنبه</div>
                              <div>دوشنبه</div>
                              <div>چهارشنبه</div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1 text-xs text-ink-4 pr-1 h-5 mb-1">
                                {(() => {
                                  const months = [];
                                  let lastMonth = '';
                                  const weeksData = [];
                                  for (let i = 0; i < heatmapData.length; i += 7) {
                                    weeksData.push(heatmapData.slice(i, i + 7));
                                  }
                                  weeksData.forEach((week, weekIndex) => {
                                    if (week.length > 0) {
                                      const date = new Date(week[0].date + 'T12:00:00');
                                      const monthName = date.toLocaleDateString('fa-IR', { month: 'short' });
                                      if (monthName !== lastMonth) {
                                        months.push(
                                          <div key={weekIndex} style={{ gridColumn: weekIndex + 1, width: '40px' }}>
                                            {monthName}
                                          </div>
                                        );
                                        lastMonth = monthName;
                                      }
                                    }
                                  });
                                  return <div className="flex gap-[14px]">{months}</div>;
                                })()}
                              </div>

                              <div className="inline-grid gap-1" style={{
                                gridTemplateRows: 'repeat(7, 16px)',
                                gridAutoFlow: 'column',
                              }}>
                                {heatmapData.map((day, idx) => (
                                  <div key={idx}
                                    className={`w-4 h-4 rounded-sm ${getHeatmapColor(day.totalMinutes)}
                                                hover:ring-2 hover:ring-brand transition cursor-pointer group relative`}
                                  >
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2
                                                    transform -translate-x-1/2 mb-2 bg-panel text-ink text-xs
                                                    rounded-lg py-2 px-3 whitespace-nowrap z-50 pointer-events-none
                                                    border border-edge-2 shadow-xl">
                                      <div className="font-semibold text-center mb-1">
                                        {new Date(day.date + 'T12:00:00').toLocaleDateString('fa-IR')}
                                      </div>
                                      <div className="text-brand">{day.totalMinutes} دقیقه مطالعه</div>
                                      <div className="text-ink-3">{day.sessions} جلسه</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex md:hidden items-center justify-center gap-2 text-xs text-ink-3 mt-6">
                          <span>کمتر</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 bg-panel rounded-sm" />
                            <div className="w-4 h-4 bg-emerald-900/50 rounded-sm" />
                            <div className="w-4 h-4 bg-emerald-700/70 rounded-sm" />
                            <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                            <div className="w-4 h-4 bg-emerald-400 rounded-sm" />
                          </div>
                          <span>بیشتر</span>
                        </div>
                      </div>

                      {/* دونات چارت — پایین در موبایل، چپ در دسکتاپ */}
                      {getSubjectData(filteredSessions).length > 0 && (
                        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
                          <SubjectDonutChart
                            subjectData={getSubjectData(filteredSessions)}
                            getSubjectColor={getSubjectColor}
                            formatDuration={formatDuration}
                            totalSeconds={getTotalStudyTime(filteredSessions)}
                          />
                        </div>
                      )}
                    </div>

                    {/* تفکیک موضوعات */}
                    {getSubjectData(filteredSessions).length > 0 && (
                      <div className="bg-card p-6 rounded-xl border border-edge mb-8">
                        <h2 className="text-2xl font-semibold mb-6 text-ink-2">
                          زمان پیشروی بر اساس موضوع
                        </h2>
                        <div className="space-y-4">
                          {getSubjectData(filteredSessions)
                            .sort((a, b) => b.duration - a.duration)
                            .map(({ subject, duration, percentage }) => (
                              <div key={subject}>
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: getSubjectColor(subject) }} />
                                    <span className="text-ink-2 font-medium">{subject}</span>
                                  </div>
                                  <div className="text-ink-3 text-sm md:text-base">
                                    {formatDuration(duration)} ({percentage}%)
                                  </div>
                                </div>
                                <div className="w-full bg-panel rounded-full h-2">
                                  <div className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: getSubjectColor(subject),
                                    }} />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* جلسات اخیر */}
                    <div className="bg-card p-6 rounded-xl border border-edge mb-6">
                      <h2 className="text-2xl font-semibold mb-4 text-ink-2">پیشروی‌های تازه</h2>
                      {filteredSessions.length === 0 ? (
                        <div className="text-center py-8 text-ink-4">
                          در این بازه زمانی جلسه‌ای ثبت نشده است
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {filteredSessions.slice(0, 20).map((session) => (
                            <div key={session.id}
                              className="flex flex-col md:flex-row md:justify-between md:items-center
                                         gap-2 p-4 bg-panel rounded-lg hover:bg-panel-hover transition">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getSubjectColor(session.subject_name) }} />
                                <div>
                                  <div className="font-semibold text-ink-2">{session.subject_name}</div>
                                  {session.description && (
                                    <div className="text-sm text-ink-4">{session.description}</div>
                                  )}
                                  <div className="text-sm text-ink-4 md:hidden">
                                    {formatRelativeDateIran(session.start_time)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:justify-end gap-4 md:mr-4">
                                <div className="text-brand font-semibold">
                                  {formatDuration(session.duration_seconds)}
                                </div>
                                <div className="text-sm text-ink-4 hidden md:block">
                                  {formatRelativeDateIran(session.start_time)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}

        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
