import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStudyTimer } from '../hooks/useStudyTimer';
import BottomNav from '../components/BottomNav';
import { dataAPI, authAPI } from '../api/client';
import { formatRelativeDateIran, getStartOfDayIran } from '../utils/dateUtils';
import { useSubjects, useSessions, useInvalidateSessions, useInvalidateSubjects } from '../hooks/useDataQueries';
import LaunchButton from '../components/LaunchButton';
import TimerCircle from '../components/TimerCircle';
import { useTheme } from '../contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';
import { usePWA } from '../hooks/PWAContext';

const PREFERRED_SUBJECT_KEY = 'desko_preferred_subject';

const TOP_BTN_CLASS =
  'rounded-xl bg-panel/80 backdrop-blur-md text-ink-3 hover:text-ink ' +
  'hover:bg-panel border border-edge shadow-lg transition-all active:scale-95 ' +
  'flex items-center gap-1.5';

const ACTIVITY_OPTIONS = [
  { id: 'study', label: 'مطالعه', color: '#10b981' },
  { id: 'solve', label: 'حل سوال', color: '#3b82f6' },
  { id: 'review', label: 'مرور', color: '#8b5cf6' },
  { id: 'homework', label: 'تکلیف', color: '#f59e0b' },
];

const QUICK_LINKS_PRIMARY = [
  {
    to: '/calendar/homework',
    label: 'تکالیف',
    gradient: 'from-violet-500/20 to-purple-600/20',
    border: 'border-violet-400/40 hover:border-violet-300/60',
    hover: 'hover:from-violet-500/30 hover:to-purple-600/30',
    iconBg: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/50',
    glow: '0 0 20px rgba(139,92,246,0.35)',
    text: 'text-violet-200',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.25 3.75h7.5a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-12A2.25 2.25 0 018.25 3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15.75h4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 5.25h4.5" />
      </>
    ),
  },
  {
    to: '/online-class',
    label: 'کلاس آنلاین',
    gradient: 'from-sky-500/20 to-cyan-600/20',
    border: 'border-sky-400/40 hover:border-sky-300/60',
    hover: 'hover:from-sky-500/30 hover:to-cyan-600/30',
    iconBg: 'from-sky-500 to-cyan-500',
    shadow: 'shadow-sky-500/50',
    glow: '0 0 20px rgba(14,165,233,0.35)',
    text: 'text-sky-200',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14
           M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
  },
  {
    to: '/ai-assistant',
    label: 'دستیار AI',
    gradient: 'from-pink-500/20 to-rose-600/20',
    border: 'border-pink-400/40 hover:border-pink-300/60',
    hover: 'hover:from-pink-500/30 hover:to-rose-600/30',
    iconBg: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/50',
    glow: '0 0 20px rgba(236,72,153,0.35)',
    text: 'text-pink-200',
    iconFill: true,
    icon: (
      <path d="M12 3l2.2 5.4L20 10.5l-5.8 2.1L12 18l-2.2-5.4L4 10.5l5.8-2.1L12 3z" />
    ),
  },
];

const QUICK_LINKS_SECONDARY = [
  {
    to: '/notes',
    label: 'یادداشت‌ها',
    gradient: 'from-emerald-500/15 to-teal-600/15',
    border: 'border-emerald-500/25 hover:border-emerald-400/50',
    hover: 'hover:from-emerald-500/25 hover:to-teal-600/25',
    iconBg: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/40',
    text: 'text-emerald-300',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
           m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
  },
  {
    to: '/exam-results',
    label: 'آزمون‌ها',
    gradient: 'from-amber-500/15 to-orange-600/15',
    border: 'border-amber-500/25 hover:border-amber-400/50',
    hover: 'hover:from-amber-500/25 hover:to-orange-600/25',
    iconBg: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/40',
    text: 'text-amber-300',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    to: '/pdf-reader',
    label: 'کتابخانه',
    gradient: 'from-indigo-500/15 to-blue-600/15',
    border: 'border-indigo-500/25 hover:border-indigo-400/50',
    hover: 'hover:from-indigo-500/25 hover:to-blue-600/25',
    iconBg: 'from-indigo-500 to-blue-600',
    shadow: 'shadow-indigo-500/40',
    text: 'text-indigo-300',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
  },
  {
    to: '/todos',
    label: 'کارها',
    gradient: 'from-lime-500/15 to-green-600/15',
    border: 'border-lime-500/25 hover:border-lime-400/50',
    hover: 'hover:from-lime-500/25 hover:to-green-600/25',
    iconBg: 'from-lime-500 to-green-600',
    shadow: 'shadow-lime-500/40',
    text: 'text-lime-300',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
        <circle cx="4.5" cy="6.75" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="17.25" r="1.25" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

function QuickLinkTile({ item, featured = false, compact = false }) {
  const iconSize = featured
    ? (compact ? 'w-9 h-9' : 'w-12 h-12')
    : (compact ? 'w-8 h-8' : 'w-9 h-9');
  const svgSize = featured
    ? (compact ? 'w-4 h-4' : 'w-5 h-5')
    : (compact ? 'w-3.5 h-3.5' : 'w-4 h-4');
  const labelClass = featured
    ? (compact ? 'text-[9px]' : 'text-[11px]')
    : (compact ? 'text-[7px]' : 'text-[8px]');
  const py = featured
    ? (compact ? 'py-2.5' : 'py-3.5')
    : '';
  const px = featured ? (compact ? 'px-1.5' : 'px-2') : 'px-1';
  const rounded = featured ? 'rounded-2xl' : 'rounded-xl';
  const tileLayout = featured
    ? `gap-1 ${py} ${px}`
    : `gap-1 aspect-[5/6] py-2.5 ${px}`;

  return (
    <Link
      to={item.to}
      className={`flex flex-col items-center justify-center ${tileLayout} ${rounded}
                 bg-gradient-to-br ${item.gradient} border ${item.border} ${item.hover}
                 transition-all duration-200 active:scale-95 min-w-0
                 ${featured
                   ? 'bg-card/25 backdrop-blur-sm ring-1 ring-white/15 hover:ring-white/25 ' +
                     'shadow-[0_6px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.07)_inset] ' +
                     'hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)]'
                   : 'shadow-sm shadow-black/20'}`}
    >
      <div
        className={`${iconSize} ${rounded} bg-gradient-to-br ${item.iconBg}
                    flex items-center justify-center shadow-md ${item.shadow} shrink-0
                    ${featured ? 'ring-2 ring-white/20' : ''}`}
        style={featured && item.glow ? { boxShadow: item.glow } : undefined}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`${svgSize} text-white`}
          fill={item.iconFill ? 'currentColor' : 'none'}
          viewBox="0 0 24 24" stroke={item.iconFill ? 'none' : 'currentColor'} strokeWidth={2}>
          {item.icon}
        </svg>
      </div>
      <span className={`${labelClass} font-semibold ${item.text} leading-tight text-center px-0.5`}>
        {item.label}
      </span>
    </Link>
  );
}

function QuickLinkGrid({ compact = false }) {
  const primaryGap = compact ? 'gap-1.5' : 'gap-2';
  const secondaryGap = compact ? 'gap-3.5' : 'gap-4';
  const sectionGap = compact ? 'gap-2' : 'gap-2.5';

  return (
    <div className={`w-full max-w-[360px] flex flex-col ${sectionGap} ${compact ? 'mt-1' : ''}`}>
      <div className={`grid grid-cols-3 ${primaryGap}`}>
        {QUICK_LINKS_PRIMARY.map((item) => (
          <QuickLinkTile key={item.to} item={item} featured compact={compact} />
        ))}
      </div>
      <div className={`grid grid-cols-4 ${secondaryGap} w-full`}>
        {QUICK_LINKS_SECONDARY.map((item) => (
          <QuickLinkTile key={item.to} item={item} compact={compact} />
        ))}
      </div>
    </div>
  );
}

/* ── راهنمای شروع — بیضی شفاف بیرون هاله + فلش مماس ─── */
function StartHintCloud({ visible, buttonSize = 196 }) {
  if (!visible) return null;

  const scale = buttonSize / 208;
  const R_HALO = 97;
  // شعاع بصری هاله (glow + stroke) برای مماس شدن فلش
  const visualOuterR = (R_HALO + 32) * scale;

  const hintW = 88;
  const hintH = 54;
  const hintA = hintW / 2;
  const hintB = hintH / 2;
  const gap = 18;

  const cx = buttonSize / 2;
  const cy = buttonSize / 2;
  const rad = Math.PI / 4;

  // بردار از بیضی به مرکز (جنوب‌غربی)
  const towardCenter = {
    x: -Math.cos(rad),
    y: Math.sin(rad),
  };

  const ellipseEdge = (hintA * hintB) / Math.hypot(hintB * towardCenter.x, hintA * towardCenter.y);

  const hintDist = visualOuterR + gap + ellipseEdge;
  const hintCX = cx + Math.cos(rad) * hintDist;
  const hintCY = cy - Math.sin(rad) * hintDist;

  const arrowTipX = cx + Math.cos(rad) * visualOuterR;
  const arrowTipY = cy - Math.sin(rad) * visualOuterR;

  const arrowStartX = hintCX + towardCenter.x * ellipseEdge;
  const arrowStartY = hintCY + towardCenter.y * ellipseEdge;

  const headLen = 11;
  const headW = 6.5;
  const baseX = arrowTipX - towardCenter.x * headLen;
  const baseY = arrowTipY - towardCenter.y * headLen;
  const px = -towardCenter.y;
  const py = towardCenter.x;
  const arrowHead = [
    `${arrowTipX},${arrowTipY}`,
    `${baseX + px * headW},${baseY + py * headW}`,
    `${baseX - px * headW},${baseY - py * headW}`,
  ].join(' ');

  const shaftEndX = arrowTipX - towardCenter.x * headLen * 0.55;
  const shaftEndY = arrowTipY - towardCenter.y * headLen * 0.55;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none overflow-visible animate-fadeIn"
      style={{ animation: 'hintFloat 3s ease-in-out infinite' }}
      aria-live="polite"
    >
      <svg
        className="absolute inset-0 overflow-visible"
        width={buttonSize}
        height={buttonSize}
        aria-hidden
      >
        <line
          x1={arrowStartX}
          y1={arrowStartY}
          x2={shaftEndX}
          y2={shaftEndY}
          stroke="rgba(110,231,183,0.8)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polygon
          points={arrowHead}
          fill="rgba(52,211,153,0.85)"
          stroke="rgba(167,243,208,0.6)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className="absolute flex items-center justify-center
                   border border-emerald-200/40 backdrop-blur-lg
                   shadow-[0_4px_24px_rgba(52,211,153,0.28),0_0_0_1px_rgba(255,255,255,0.06)_inset]
                   bg-gradient-to-br from-emerald-100/28 via-white/14 to-emerald-900/22"
        style={{
          width: hintW,
          height: hintH,
          left: hintCX - hintW / 2,
          top: hintCY - hintH / 2,
          borderRadius: '50%',
        }}
      >
        <span className="text-[11px] font-bold text-emerald-50 whitespace-nowrap drop-shadow-sm">
          شروع کن
        </span>
      </div>

      <style>{`
        @keyframes hintFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

/* ── دکمه تغییر تم ───────────────────────────────────────── */
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-panel/80 backdrop-blur-md text-ink-3 hover:text-ink
                 hover:bg-panel border border-edge shadow-lg transition-all active:scale-95
                 flex items-center justify-center"
      aria-label={isLight ? 'تبدیل به حالت تاریک' : 'تبدیل به حالت روشن'}
      title={isLight ? 'Dark Mode' : 'Light Mode'}
    >
      {isLight ? (
        /* آیکون ماه — نشان‌دهنده حالت تاریک */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        /* آیکون خورشید — نشان‌دهنده حالت روشن */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round"
            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
               M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}

/* ── دکمه نصب PWA — فقط در مرورگر وب نمایش داده می‌شود ─── */
function WebInstallButton() {
  const navigate = useNavigate();
  const { deferredPrompt, isStandalone } = usePWA();
  const isNative = Capacitor.isNativePlatform();

  // در اپ اندروید native یا پس از نصب PWA، spacer نامرئی برمی‌گردانیم
  if (isNative || isStandalone) return <div className="h-9" />;

  return (
    <button
      onClick={() => navigate('/install-app')}
      className="rounded-xl px-3 py-2 flex items-center gap-1.5 transition-all active:scale-95
                 bg-white/12 backdrop-blur-md border border-white/25 text-white/95
                 hover:bg-white/18 hover:border-white/35
                 shadow-[0_2px_14px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.25)]"
      aria-label="نصب اپلیکیشن"
      title="نصب اپلیکیشن"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-white" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2
             M7 10l5 5 5-5
             M12 15V3" />
      </svg>
      <span className="text-xs font-semibold whitespace-nowrap text-white/90">نصب اپلیکیشن</span>
    </button>
  );
}

/* ── راهنمای صفحه ───────────────────────────────────────── */
function PageGuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl p-2 flex items-center gap-1.5 transition-all active:scale-95
                   bg-amber-500/15 backdrop-blur-md border border-amber-400/40
                   text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 hover:border-amber-300/55
                   shadow-[0_2px_14px_rgba(251,191,36,0.18)]"
        aria-label="راهنمای میزکار"
        title="راهنما"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-300" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
               m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
               A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
               c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full end-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl
                     border border-edge bg-card/95 backdrop-blur-md p-4 shadow-2xl z-[70]
                     text-right animate-fadeIn"
        >
          <h4 className="font-bold text-brand text-sm mb-2">💡 راهنمای میزکار</h4>
          <p className="text-xs text-ink-2 leading-relaxed">
            با کلیک روی دایرهٔ سبز، جلسهٔ مطالعه شروع می‌شود. درس مورد نظر را از باکس بالا
            انتخاب کن تا هنگام ثبت کارنامه به‌صورت پیش‌فرض همان درس انتخاب شود.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── انتخاب (اکاردئون عمومی) ─────────────────────────────── */
function SelectionAccordion({
  caption,
  placeholder,
  indicatorColor,
  items,
  selected,
  onSelect,
  open,
  onToggle,
}) {
  const active = items.find((i) => i.id === selected);

  return (
    <div className="relative z-20 flex-1 min-w-0">
      <div className="rounded-2xl border border-edge/80 bg-card/50 backdrop-blur-md
                      shadow-lg shadow-black/10">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5
                     hover:bg-panel/40 transition-colors rounded-2xl"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
              style={{ backgroundColor: indicatorColor || active?.color || '#10b981' }}
            />
            <div className="text-right min-w-0">
              <p className="text-[10px] text-ink-4">{caption}</p>
              <p className="text-xs font-bold text-ink truncate">
                {active?.label || placeholder}
              </p>
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 text-ink-3 shrink-0 transition-transform duration-200
                        ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-2xl border border-edge/80
                     bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 z-50
                     max-h-40 overflow-y-auto scroll-touch animate-fadeIn"
        >
          {items.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-ink-4 text-center">گزینه‌ای وجود ندارد.</p>
          ) : (
            items.map((item) => {
              const isSelected = item.id === selected;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-right transition
                              first:rounded-t-2xl last:rounded-b-2xl
                              ${isSelected ? 'bg-brand/10' : 'hover:bg-panel/50'}`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || '#10b981' }}
                  />
                  <span className={`text-xs truncate ${isSelected ? 'font-bold text-brand' : 'text-ink-2'}`}>
                    {item.label}
                  </span>
                  {isSelected && (
                    <span className="mr-auto text-brand text-[10px]">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── کامپوننت اصلی ───────────────────────────────────────── */
const StudyTimer = () => {
  const navigate = useNavigate();
  const { data: courses = [] } = useSubjects();
  const { data: sessionsData = [] } = useSessions();
  const invalidateSessions = useInvalidateSessions();
  const invalidateSubjects = useInvalidateSubjects();
  const [showDescription, setShowDescription] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [preferredCourse, setPreferredCourse] = useState('');
  const [courseAccordionOpen, setCourseAccordionOpen] = useState(false);
  const [preferredActivity, setPreferredActivity] = useState('study');
  const [activityAccordionOpen, setActivityAccordionOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [adjustedTime, setAdjustedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [todayStats, setTodayStats] = useState({ time: 0, sessions: 0 });
  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [orbHovered, setOrbHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showStartHint, setShowStartHint] = useState(false);
  const originalStartTimeRef = useRef(null);
  const originalEndTimeRef = useRef(null);
  const [showBlackOverlay, setShowBlackOverlay] = useState(false);
  const { seconds, isActive, isPaused, focusLost, start, pause, resume, stop } = useStudyTimer(0);

  /* ── داده‌های اولیه ──────────────────────────────────── */
  useEffect(() => {
    const initData = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (!isLoggedIn) { navigate('/login'); return; }

      try {
        const cachedStr = localStorage.getItem('userProfile');
        if (cachedStr) JSON.parse(cachedStr);
      } catch (e) {}

      try {
        const profileRes = await authAPI.getProfile();
        const fetchedProfile = profileRes.data;
        localStorage.setItem('userProfile', JSON.stringify(fetchedProfile));
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    initData();

    if (!localStorage.getItem('hasVisitedTimer')) setShowOnboarding(true);

    /* ── تایمر بی‌تحرکی ── */
    let inactivityTimer;
    const IDLE_TIMEOUT = 120_000;

    const isMobileOrTablet = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileOS = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
      const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
      const isWindowsLaptop =
        /windows nt/i.test(ua) && window.matchMedia('(pointer: fine)').matches;
      return (isMobileOS || isIPadOS || isTouchPrimary) && !isWindowsLaptop;
    };

    const isDeviceEligible = isMobileOrTablet();

    const resetInactivityTimer = () => {
      setShowBlackOverlay(false);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (isActive && !isPaused && isDeviceEligible) {
        inactivityTimer = setTimeout(() => setShowBlackOverlay(true), IDLE_TIMEOUT);
      }
    };

    if (isActive && !isPaused && isDeviceEligible) {
      window.addEventListener('touchstart', resetInactivityTimer, { passive: true });
      window.addEventListener('mousedown', resetInactivityTimer, { passive: true });
      window.addEventListener('scroll', resetInactivityTimer, { passive: true });
      resetInactivityTimer();
    } else {
      setShowBlackOverlay(false);
    }

    return () => {
      window.removeEventListener('touchstart', resetInactivityTimer);
      window.removeEventListener('mousedown', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [navigate, isActive, isPaused]);

  /* ── بازیابی درس انتخابی ── */
  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_SUBJECT_KEY);
    if (saved && courses.some((c) => c.name === saved)) {
      setPreferredCourse(saved);
      setSelectedSubject(saved);
      return;
    }
    if (courses.length > 0 && !preferredCourse) {
      const first = courses[0].name;
      setPreferredCourse(first);
      setSelectedSubject(first);
      localStorage.setItem(PREFERRED_SUBJECT_KEY, first);
    }
  }, [courses, preferredCourse]);

  /* ── راهنمای شروع پس از ۱۰ ثانیه ── */
  useEffect(() => {
    if (isActive || isLaunching) {
      setShowStartHint(false);
      return undefined;
    }
    const timer = setTimeout(() => setShowStartHint(true), 10_000);
    return () => clearTimeout(timer);
  }, [isActive, isLaunching]);

  const handleSelectPreferredCourse = (name) => {
    setPreferredCourse(name);
    setSelectedSubject(name);
    localStorage.setItem(PREFERRED_SUBJECT_KEY, name);
    setCourseAccordionOpen(false);
  };

  const courseItems = courses.map((c) => ({
    id: c.name,
    label: c.name,
    color: c.color_code || c.color,
  }));

  const activeCourse = courses.find((c) => c.name === preferredCourse);

  const handleSelectActivity = (id) => {
    setPreferredActivity(id);
    setActivityAccordionOpen(false);
  };

  /* ── محاسبه آمار امروز از داده‌های Query ── */
  useEffect(() => {
    const startOfTodayLocal = getStartOfDayIran();
    const todaySessions = sessionsData.filter((session) => {
      const sessionDate = getStartOfDayIran(session.start_time);
      return sessionDate.getTime() === startOfTodayLocal.getTime();
    });
    const todayTotalSeconds = todaySessions.reduce(
      (total, s) => total + s.duration_seconds, 0
    );
    setTodayStats({ time: todayTotalSeconds, sessions: todaySessions.length });
  }, [sessionsData]);

  /* ── بازیابی زمان شروع از localStorage ── */
  useEffect(() => {
    if (isActive && !startTime) {
      try {
        const savedState = localStorage.getItem('timerState');
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.startTime) setStartTime(new Date(state.startTime));
        }
      } catch { /* silent */ }
    }
  }, [isActive, startTime]);

  /* ── عملیات تایمر ── */
  const handleStart = async () => {
    if (isLaunching) return;
    setShowStartHint(false);
    setIsLaunching(true);
    setStartTime(new Date());
    authAPI.updateStudyStatus(true).catch(console.error);
    // صبر برای تکمیل انیمیشن پر شدن قوس (680ms)
    await new Promise(r => setTimeout(r, 680));
    setIsLaunching(false);
    start();
  };

  const handleStop = async () => {
    const studyTime = seconds;
    const end = new Date();
    setEndTime(end);
    authAPI.updateStudyStatus(false).catch(console.error);

    const computedStart = new Date(end.getTime() - studyTime * 1000);
    setStartTime(computedStart);
    originalStartTimeRef.current = computedStart;
    originalEndTimeRef.current = end;

    if (studyTime > 0) {
      setAdjustedTime(studyTime);
      setNewCourseName(preferredCourse || '');
      setSelectedSubject(preferredCourse || '');
      setShowSaveModal(true);
    } else {
      stop();
    }
  };

  const handleSaveSession = async (
    finalTime, editedStartTime, editedEndTime, courseName, courseDescription
  ) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      setShowSaveModal(false);
      setNewCourseName('');
      setDescription('');
      setSelectedSubject('');
      localStorage.removeItem('timerState');
      stop();

      await dataAPI.createSession({
        subject_name: courseName,
        description: courseDescription,
        start_time: editedStartTime.toISOString(),
        end_time: editedEndTime.toISOString(),
      });

      const sessionDate = getStartOfDayIran(editedStartTime);
      if (sessionDate.getTime() === getStartOfDayIran().getTime()) {
        setTodayStats((prev) => ({
          time: (prev.time || 0) + finalTime,
          sessions: (prev.sessions || 0) + 1,
        }));
      }

      invalidateSessions();
      invalidateSubjects();
    } catch (error) {
      console.error('Failed to save session:', error.response?.data || error.message);
      alert(`خطا در ذخیره جلسه: ${JSON.stringify(error.response?.data || error.message)}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── توابع کمکی ── */
  const formatTime = (totalSeconds) => {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00';
    }
    if (totalSeconds < 3600) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCourseColor = (courseName) => {
    const course = courses.find((c) => c.name === courseName);
    return course?.color_code || '#10b981';
  };

  const onboardingContent = [
    {
      title: 'رشدت رو با یه کلیک شروع کن',
      description:
        'کافیه درسی که می‌خوای رو انتخاب کنی و دکمه شروع رو بزنی تا جلسه مطالعه عمیقت استارت بخوره!',
      icon: '🌱',
    },
    {
      title: 'با پالس (Pulse) نفس بکش',
      description:
        'دایره سبز دقیقا با ریتم نفس کشیدنت حرکت می‌کنه؛ ۴ ثانیه دم، ۴ ثانیه بازدم. اینطوری حسابی آروم میشی و تمرکزت می‌ره بالا.',
      icon: '🫁',
    },
    {
      title: 'یه پومودوروی کاملاً منعطف',
      description:
        'وسط کار یکی دو تا وقفه زیر ۵ دقیقه پیش اومد؟ فدای سرت! برگرد و پرقدرت ادامه بده، اینجا فقط تمرکز تو برامون مهمه.',
      icon: '💡',
    },
  ];

  /* ─────────────────────────────────── JSX ──────────────────────────────────── */
  return (
    <div className="h-full bg-page text-ink flex flex-col relative overflow-hidden">

      {/* پترن نقطه‌ای پس‌زمینه */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, var(--t-grid-dot) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── حالت غیر فعال (صفحه اصلی) ── */}
      {!isActive ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-visible relative z-10">

          {/* نوار بالا */}
          <div className="relative z-40 flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <WebInstallButton />
            <PageGuideButton />
          </div>

          {/* بدنه — انتخاب درس + تایمر + میانبرها */}
          <div
            className="flex-1 min-h-0 flex flex-col items-center px-4 overflow-visible"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* انتخاب درس + فعالیت */}
            <div className="w-full shrink-0 mt-6 mb-4 flex gap-2">
              <SelectionAccordion
                caption="درس امروز"
                placeholder="انتخاب درس"
                indicatorColor={activeCourse?.color_code || activeCourse?.color}
                items={courseItems}
                selected={preferredCourse}
                onSelect={handleSelectPreferredCourse}
                open={courseAccordionOpen}
                onToggle={() => {
                  setCourseAccordionOpen((v) => !v);
                  setActivityAccordionOpen(false);
                }}
              />
              <SelectionAccordion
                caption="نوع فعالیت"
                placeholder="انتخاب فعالیت"
                items={ACTIVITY_OPTIONS}
                selected={preferredActivity}
                onSelect={handleSelectActivity}
                open={activityAccordionOpen}
                onToggle={() => {
                  setActivityAccordionOpen((v) => !v);
                  setCourseAccordionOpen(false);
                }}
              />
            </div>

            {/* تایمر و میانبرها — کنار هم در مرکز */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-13 w-full overflow-visible">
              <div
                className="relative flex items-center justify-center shrink-0 overflow-visible"
                onMouseEnter={() => setOrbHovered(true)}
                onMouseLeave={() => setOrbHovered(false)}
              >
                <LaunchButton
                  size={196}
                  onClick={handleStart}
                  isHovered={orbHovered}
                  isLaunching={isLaunching}
                />
                <StartHintCloud visible={showStartHint && !isLaunching} buttonSize={196} />
              </div>

              <div className="shrink-0 w-full flex justify-center">
                <QuickLinkGrid />
              </div>
            </div>
          </div>

          {(courseAccordionOpen || activityAccordionOpen) && (
            <button
              type="button"
              aria-label="بستن منو"
              className="fixed inset-0 z-10 bg-black/20"
              onClick={() => {
                setCourseAccordionOpen(false);
                setActivityAccordionOpen(false);
              }}
            />
          )}

          {/* باکس مطالعه امروز — موقتاً غیرفعال
          <div className="w-full max-w-md mx-auto px-4 space-y-4 shrink-0 pb-22 mb-4">
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-3 border border-edge">
              <h3 className="text-center text-ink-3 text-sm mb-2">امروز</h3>
              <div className="flex justify-around">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-brand">
                    {Math.floor(todayStats.time / 3600)}:
                    {String(Math.floor((todayStats.time % 3600) / 60)).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-ink-4 mt-1">مقدار پیشروی</div>
                </div>
              </div>
            </div>
          </div>
          */}
        </div>
      ) : (
        /* ── حالت فعال (تایمر در حال اجرا) ── */
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-10 animate-fadeIn">

          <div className="absolute top-3 end-3 z-20">
            <button
              onClick={() => setShowGuideTooltip(!showGuideTooltip)}
              className="w-9 h-9 rounded-xl bg-panel/50 hover:bg-panel/80 transition
                         flex items-center justify-center text-lg border border-edge/50"
            >
              ؟
              {showGuideTooltip && (
                <div className="absolute top-11 end-0 w-56 bg-card border border-edge-2
                               rounded-xl p-3 shadow-2xl z-20 text-right animate-fadeIn">
                  <h4 className="font-semibold mb-1.5 text-brand text-xs">💡 راهنما</h4>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    ضربان ثانیه‌ها، یعنی داری رشد می‌کنی 😊
                  </p>
                </div>
              )}
            </button>
          </div>

          <div
            className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 w-full"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex flex-col items-center gap-4 w-full max-w-[360px]">
              <div className="relative shrink-0">
                <TimerCircle
                  timeText={formatTime(seconds)}
                  isPaused={isPaused}
                  size={260}
                />
              </div>

              <div className="flex flex-col items-center gap-10 w-full mt-8">
                <div className="flex gap-3 justify-center items-center shrink-0">
                  <button
                    onClick={isPaused ? resume : pause}
                    className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                      isPaused
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/40'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 shadow-md shadow-yellow-500/40'
                    }`}
                  >
                    {isPaused ? 'ادامه ▶' : 'توقف ⏸'}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600
                               hover:from-red-600 hover:to-pink-700 font-semibold text-sm
                               shadow-md shadow-red-500/40 transition-all duration-200"
                  >
                    پایان ⏹
                  </button>
                </div>

                <QuickLinkGrid compact />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── مدال ذخیره جلسه ── */}
      {showSaveModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-end md:items-center
                        justify-center z-50 px-0 md:px-4 animate-fadeIn safe-area-pb"
          style={{ background: 'var(--t-overlay)' }}>
          <div className="bg-card rounded-t-3xl md:rounded-2xl p-4 md:p-6 max-w-lg w-full
                          border-t-4 md:border border-brand-2 shadow-2xl
                          animate-slideUp md:animate-fadeIn">
            <h2 className="text-xl font-bold mb-4 text-center text-brand">
              ثبت در کارنامه 📝
            </h2>

            {/* انتخاب درس */}
            <div className="mb-3">
              <label className="block text-ink-3 mb-2 text-sm font-medium">
                نام درس <span className="text-red-400">*</span>
              </label>
              {courses.length > 0 && (
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setNewCourseName(course.name);
                          setSelectedSubject(course.name);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs ${
                          newCourseName === course.name
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                            : 'bg-panel text-ink-2 hover:bg-panel-hover'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: course.color_code || course.color }} />
                        {course.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="یا نام درس جدید بنویس..."
                className="w-full px-3 py-2.5 bg-card-deep text-ink rounded-xl border border-edge
                           focus:outline-none focus:border-brand-2 focus:ring-2
                           focus:ring-brand-2/20 transition-all text-sm"
                autoFocus
                disabled={isSaving}
              />
            </div>

            {/* توضیحات — قابل باز/بسته شدن */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowDescription((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-ink-4 hover:text-ink-3 transition-colors"
              >
                <span>{showDescription ? '▾' : '▸'}</span>
                {showDescription ? 'بستن توضیحات' : '+ افزودن توضیحات (اختیاری)'}
              </button>
              {showDescription && (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: تمرین فصل ۳، حل تست، ..."
                  rows="2"
                  className="mt-2 w-full px-3 py-2 bg-card-deep text-ink rounded-xl border border-edge
                             focus:outline-none focus:border-brand-2 focus:ring-2
                             focus:ring-brand-2/20 transition-all resize-none text-sm"
                  disabled={isSaving}
                />
              )}
            </div>

            {/* تایم‌لاین */}
            <div className="mb-3 bg-panel/50 rounded-xl p-3">
              <label className="block text-ink-3 mb-2 text-xs font-medium">تایم‌لاین جلسه</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink-4 mb-2">زمان شروع</label>
                  <input
                    type="time"
                    value={startTime && !isNaN(startTime.getTime())
                      ? startTime.toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const base = (startTime && !isNaN(startTime.getTime()))
                        ? startTime : new Date();
                      let newStart = new Date(base);
                      newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      if (endTime && !isNaN(endTime.getTime())) {
                        if (newStart > endTime) newStart.setDate(newStart.getDate() - 1);
                      }
                      // شروع نمی‌تواند بعد از پایان باشد
                      if (endTime && !isNaN(endTime.getTime()) && newStart >= endTime) {
                        return;
                      }
                      if (endTime && !isNaN(endTime.getTime())) {
                        setAdjustedTime(Math.max(60, Math.floor((endTime - newStart) / 1000)));
                      }
                      setStartTime(newStart);
                    }}
                    className="w-full px-3 py-2 bg-card text-ink rounded-lg border border-edge
                               focus:outline-none focus:border-brand-2 text-sm"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-4 mb-2">زمان پایان</label>
                  <input
                    type="time"
                    value={endTime && !isNaN(endTime.getTime())
                      ? endTime.toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const base = (endTime && !isNaN(endTime.getTime()))
                        ? endTime : new Date();
                      let newEnd = new Date(base);
                      newEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      if (startTime && !isNaN(startTime.getTime())) {
                        if (newEnd < startTime) newEnd.setDate(newEnd.getDate() + 1);
                      }
                      // پایان نمی‌تواند قبل از شروع باشد
                      if (startTime && !isNaN(startTime.getTime()) && newEnd <= startTime) {
                        return;
                      }
                      if (startTime && !isNaN(startTime.getTime())) {
                        setAdjustedTime(
                          Math.max(60, Math.floor((newEnd - startTime) / 1000))
                        );
                      }
                      setEndTime(newEnd);
                    }}
                    className="w-full px-3 py-2 bg-card text-ink rounded-lg border border-edge
                               focus:outline-none focus:border-brand-2 text-sm"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="text-center text-brand font-bold mt-2 text-sm">
                مدت: {Math.floor(adjustedTime / 3600)}:
                {String(Math.floor((adjustedTime % 3600) / 60)).padStart(2, '0')}:
                {String(adjustedTime % 60).padStart(2, '0')}
              </div>
            </div>

            {/* دکمه‌های عمل */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setNewCourseName(''); setShowDescription(false); }}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-panel rounded-xl hover:bg-panel-hover
                           transition font-semibold disabled:opacity-50 text-ink text-sm"
              >
                بازگشت
              </button>
              <button
                onClick={() => {
                  if (!newCourseName.trim()) {
                    alert('لطفاً نام درس را وارد کنید!');
                    return;
                  }
                  handleSaveSession(
                    adjustedTime, startTime, endTime,
                    newCourseName.trim(), description
                  );
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600
                           rounded-xl hover:from-emerald-600 hover:to-green-700 transition
                           font-semibold shadow-lg disabled:opacity-50 text-sm"
              >
                {isSaving ? 'در حال ذخیره...' : '✓ ثبت در کارنامه'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── آنبوردینگ ── */}
      {showOnboarding && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center
                        z-50 px-4 animate-fadeIn"
          style={{ background: 'var(--t-overlay)' }}>
          <div className="bg-card rounded-2xl p-8 max-w-md w-full
                          border-2 border-brand-2/30 shadow-2xl shadow-brand-2/20">
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{onboardingContent[onboardingSlide].icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-brand">
                {onboardingContent[onboardingSlide].title}
              </h2>
              <p className="text-ink-2 text-base leading-relaxed">
                {onboardingContent[onboardingSlide].description}
              </p>
            </div>

            <div className="flex gap-2 justify-center mb-6">
              {[0, 1, 2].map((idx) => (
                <div key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === onboardingSlide ? 'bg-brand-2 w-8' : 'bg-panel w-2'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {onboardingSlide > 0 && (
                <button
                  onClick={() => setOnboardingSlide((s) => s - 1)}
                  className="flex-1 px-6 py-3 bg-panel rounded-xl hover:bg-panel-hover
                             transition font-semibold text-ink"
                >
                  ← قبلی
                </button>
              )}
              <button
                onClick={() => {
                  if (onboardingSlide < 2) {
                    setOnboardingSlide((s) => s + 1);
                  } else {
                    setShowOnboarding(false);
                    localStorage.setItem('hasVisitedTimer', 'true');
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600
                           rounded-xl hover:from-emerald-600 hover:to-green-700 transition
                           font-semibold shadow-lg"
              >
                {onboardingSlide === 2 ? '✓ شروع کنید!' : 'بعدی →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── هشدار از دست رفتن فوکوس ── */}
      {focusLost && isPaused && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center
                        z-50 px-4 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="bg-gradient-to-br from-orange-900/90 to-red-950/90 rounded-2xl p-8
                          max-w-md w-full border-2 border-orange-500 shadow-2xl shadow-orange-500/50">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">⚠️</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-orange-400">توجه!</h2>
              <p className="text-gray-200 text-base md:text-lg mb-6 leading-relaxed">
                شما برنامه را ترک کردید و تایمر متوقف شد.
                برای ادامه جلسه مطالعه، دکمه ادامه را بزنید.
              </p>
              <button
                onClick={resume}
                className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600
                           rounded-xl hover:from-emerald-600 hover:to-green-700
                           transition font-bold text-lg md:text-xl shadow-lg"
              >
                ✓ ادامه می‌دهم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── صفحه سیاه بی‌تحرکی ── */}
      {showBlackOverlay && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center
                     justify-center animate-in fade-in duration-500"
          onClick={() => setShowBlackOverlay(false)}
          onTouchStart={() => setShowBlackOverlay(false)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default StudyTimer;
