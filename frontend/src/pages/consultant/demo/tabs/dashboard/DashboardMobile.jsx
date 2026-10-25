import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  Clock,
  FileText,
  Flame,
  GraduationCap,
  Heart,
  Mail,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';
import { PANEL } from '../../constants/theme';
import { InitialAvatar } from '../../components/PanelArt';
import { consultantIdentity, faNum, formatConsultantNow } from '../../lib/format';
import { useCounselingSessions } from '../../hooks/useConsultantQueries';
import { presentSession, tehranDateKey } from '../../lib/counselingSessions';
import { performLogout } from '../../../../../utils/auth';
import {
  MOBILE_FILTERS,
  MOBILE_PRIORITIES,
  MOBILE_STATS,
  UNREAD_MESSAGES,
} from './content';
import { QuickComposer, TONES, ToneBadge } from './shared';

const OPEN_EVENT = 'consultant:open-command-palette';
const PAGE_SIZE = 3;

const STAT_ICONS = {
  alert: AlertTriangle,
  file: FileText,
  calendar: CalendarDays,
  users: Users,
};

const FILTER_ICONS = {
  flame: Flame,
  moon: Moon,
  cap: GraduationCap,
  heart: Heart,
  users: Users,
};

export default function DashboardMobile() {
  const { navigateToTab } = useConsultant();
  const todaySessions = useCounselingSessions({ on: tehranDateKey() });
  const sessionRows = (todaySessions.data || []).map(presentSession);
  const spotlight = sessionRows.find((item) => item.statusKey === 'in_progress')
    || sessionRows.find((item) => item.statusKey === 'scheduled')
    || sessionRows[0]
    || null;
  const [now, setNow] = useState(() => formatConsultantNow());
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [composer, setComposer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const identity = consultantIdentity();

  useEffect(() => {
    const id = window.setInterval(() => setNow(formatConsultantNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [menuOpen]);

  const filtered = useMemo(() => {
    if (filter === 'all' || filter === 'everyone') return MOBILE_PRIORITIES;
    return MOBILE_PRIORITIES.filter((item) => item.tag === filter);
  }, [filter]);

  const visible = filtered.slice(0, shown);
  const remaining = Math.max(filtered.length - shown, 0);

  const chooseFilter = (id) => {
    setFilter(id);
    setShown(PAGE_SIZE);
  };

  const goStat = (stat) => {
    if (stat.tab) {
      navigateToTab(stat.tab);
      return;
    }
    document.getElementById(stat.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const logout = async () => {
    setMenuOpen(false);
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-6 max-w-3xl mx-auto w-full">
      <header
        className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-3 pb-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(243,246,244,0.94)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-full"
              aria-label="حساب کاربری"
              aria-expanded={menuOpen}
            >
              <InitialAvatar name={identity.full} size={44} className="ring-2 ring-white" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-40 rounded-2xl bg-white p-1.5 shadow-xl z-30"
                style={{ border: `1px solid ${PANEL.line}` }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="w-full text-right px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50"
                >
                  خروج از حساب
                </button>
              </div>
            )}
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[16px] font-extrabold leading-tight truncate" style={{ color: PANEL.ink }}>
              سلام، {identity.first}
              <span className="inline-block mr-1" aria-hidden="true">👋</span>
            </p>
            <p className="text-[11px] mt-1" style={{ color: PANEL.muted }}>{now.dayMonth}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-[0_6px_16px_rgba(18,70,45,0.05)]"
            aria-label="جستجو"
            style={{ color: PANEL.green }}
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-[22px] px-4 py-3.5 mt-1"
        style={{ background: 'linear-gradient(90deg, #F4FBF7 0%, #E7F6EE 100%)' }}
      >
        <p className="relative text-[12.5px] leading-6 font-medium" style={{ color: '#2F6B4E' }}>
          از آخرین ورود شما، ۴ گزارش جدید ثبت شد و ۲ دانش‌آموز از وضعیت خطر خارج شدند.
        </p>
      </section>

      <section className="mt-3 rounded-[26px] bg-white p-4" style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[15px] font-extrabold" style={{ color: PANEL.greenText }}>
              <Clock size={16} />
              {spotlight ? `جلسه ساعت ${spotlight.time}` : 'جلسه امروز'}
            </p>
            <p className="text-[13px] font-semibold mt-2" style={{ color: PANEL.ink }}>
              {todaySessions.isError
                ? 'دریافت جلسات ناموفق بود'
                : spotlight
                  ? `${spotlight.name} ، ${spotlight.topic}`
                  : todaySessions.isFetched
                    ? 'جلسه‌ای برای امروز ثبت نشده است'
                    : 'در حال دریافت جلسات…'}
            </p>
            {spotlight && (
              <p className="inline-flex items-center gap-1.5 text-[12px] mt-2 font-medium" style={{ color: spotlight.statusKey === 'in_progress' ? PANEL.blue : PANEL.muted }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: spotlight.statusKey === 'in_progress' ? '#3B82F6' : '#94A3B8' }} />
                {spotlight.status}
              </p>
            )}
            {todaySessions.isError && (
              <button type="button" onClick={() => todaySessions.refetch()} className="mt-2 text-[12px] font-bold underline" style={{ color: PANEL.greenText }}>
                تلاش دوباره
              </button>
            )}
          </div>
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: PANEL.greenSoft, color: PANEL.green }}
          >
            <CalendarDays size={22} />
          </span>
        </div>
        <div className="grid grid-cols-[1.35fr_0.9fr] gap-2 mt-4">
          <button
            type="button"
            onClick={() => navigateToTab('planning')}
            className="h-11 rounded-2xl text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 px-2"
            style={{ background: PANEL.green }}
          >
            <FileText size={15} />
            ثبت گزارش / ورود به جلسه
          </button>
          <button
            type="button"
            onClick={() => spotlight && setComposer(spotlight.name)}
            disabled={!spotlight}
            className="h-11 rounded-2xl text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 bg-white"
            style={{ color: PANEL.greenText, border: '1px solid #D5EBDF' }}
          >
            <MessageSquare size={15} />
            پیام سریع
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mt-3">
        {MOBILE_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.icon];
          const tone = TONES[stat.tone];
          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => goStat(stat)}
              className="rounded-[24px] p-3.5 min-h-[138px] text-right flex flex-col"
              style={{ background: tone.bg }}
            >
              <span className="flex items-start justify-between gap-2">
                <span
                  className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center"
                  style={{ color: tone.fg }}
                >
                  <Icon size={18} />
                </span>
                <span className="text-[30px] leading-none font-extrabold tabular-nums" style={{ color: tone.fg }}>
                  {stat.id === 'sessions' && todaySessions.isFetched ? faNum(sessionRows.length) : stat.value}
                </span>
              </span>
              <span className="mt-2 text-[13px] font-bold" style={{ color: tone.fg }}>{stat.label}</span>
              <span className="mt-auto pt-3 text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: tone.fg }}>
                {stat.action}
                <ChevronLeft size={14} />
              </span>
            </button>
          );
        })}
      </section>

      <section id="priority-students" className="mt-5 scroll-mt-24">
        <h2 className="inline-flex items-center gap-2 text-[16px] font-extrabold mb-3" style={{ color: PANEL.ink }}>
          <Target size={18} color={PANEL.green} />
          اولویت ذهنی مشاور
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOBILE_FILTERS.map((item) => {
            const Icon = FILTER_ICONS[item.icon];
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseFilter(item.id)}
                className="h-9 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 shrink-0"
                style={{
                  background: active ? PANEL.green : '#fff',
                  color: active ? '#fff' : PANEL.muted,
                  border: active ? 'none' : `1px solid ${PANEL.line}`,
                }}
              >
                <Icon size={13} />
                {item.label}
                {item.id === 'all' ? ` (${faNum(MOBILE_PRIORITIES.length)})` : ''}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 mt-3">
          {visible.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: PANEL.muted }}>موردی در این دسته نیست.</p>
          ) : visible.map((item) => (
            <article
              key={item.id}
              className="rounded-[22px] bg-white p-3"
              style={{ border: '1px solid #D7EADF', boxShadow: '0 8px 20px rgba(18,70,45,0.04)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <ChevronLeft size={14} className="shrink-0 text-[#C5D5CC]" />
                    <h3 className="text-[13.5px] font-extrabold truncate" style={{ color: PANEL.ink }}>{item.name}</h3>
                    <span className="text-[#C5D5CC] shrink-0">•</span>
                    <span className="text-[11px] shrink-0" style={{ color: PANEL.muted }}>{item.grade}</span>
                  </div>
                  <p className="text-[12px] mt-1.5 leading-5" style={{ color: PANEL.muted }}>{item.issue}</p>
                </div>
                <ToneBadge tone={item.tone}>{item.badge}</ToneBadge>
              </div>
              <div className="flex items-end gap-1.5 mt-3">
                <div className="flex flex-1 flex-wrap gap-1.5 min-w-0">
                  <CardAction icon={Phone} label="تماس با والدین" onClick={() => setComposer(item.name)} />
                  <CardAction icon={CalendarDays} label="بررسی برنامه" onClick={() => navigateToTab('planning')} />
                  <CardAction icon={MessageSquare} label="پیام سریع" onClick={() => setComposer(item.name)} />
                </div>
              </div>
            </article>
          ))}
        </div>

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE_SIZE)}
            className="mt-3 w-full h-11 rounded-full bg-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5"
            style={{ color: PANEL.greenText, border: `1px solid ${PANEL.line}` }}
          >
            <Plus size={15} />
            نمایش {faNum(Math.min(PAGE_SIZE, remaining))} اولویت دیگر
          </button>
        )}
      </section>

      <section id="inbox-queue" className="mt-5 scroll-mt-24 rounded-[26px] bg-white p-4" style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}>
        <h2 className="inline-flex items-center gap-2 text-[16px] font-extrabold mb-1" style={{ color: PANEL.ink }}>
          <Mail size={18} color={PANEL.green} />
          پیام‌های ناخوانده
        </h2>
        <ul>
          {UNREAD_MESSAGES.map((message) => (
            <li key={message.id} style={{ borderTop: `1px solid ${PANEL.line}` }}>
              <button
                type="button"
                onClick={() => setComposer(message.name)}
                className="w-full flex items-start gap-3 py-3 text-right"
              >
                <InitialAvatar name={message.name} size={42} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-extrabold truncate" style={{ color: PANEL.ink }}>{message.name}</span>
                      <span className="block text-[11px] mt-0.5" style={{ color: PANEL.muted }}>{message.role}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] tabular-nums" style={{ color: PANEL.muted }}>{message.time}</span>
                      <span className="min-w-5 h-5 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold inline-flex items-center justify-center">
                        {message.count}
                      </span>
                    </span>
                  </span>
                  <span className="block text-[12px] mt-1.5 truncate" style={{ color: PANEL.muted }}>{message.preview}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {composer && (
        <QuickComposer aboveNav target={composer} onClose={() => setComposer(null)} />
      )}
    </div>
  );
}

function CardAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-2 rounded-xl bg-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap"
      style={{ color: PANEL.greenText, border: '1px solid #D7EADF' }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
