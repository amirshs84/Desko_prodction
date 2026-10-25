import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  FileText,
  Mail,
  Phone,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';
import { PANEL } from '../../constants/theme';
import { InitialAvatar } from '../../components/PanelArt';
import { useCounselingSessions } from '../../hooks/useConsultantQueries';
import { presentSession, tehranDateKey } from '../../lib/counselingSessions';
import {
  DESKTOP_FILTERS,
  DESKTOP_STATS,
  INBOX_THREADS,
  OVERDUE_ITEMS,
  PRIORITY_ROWS,
} from './content';
import { QuickComposer, Surface, TONES, ToneBadge } from './shared';

const STAT_ICONS = {
  users: Users,
  calendar: CalendarDays,
  alert: AlertTriangle,
  file: FileText,
};

export default function DashboardDesktop() {
  const todaySessions = useCounselingSessions({ on: tehranDateKey() });
  const sessionRows = (todaySessions.data || []).map(presentSession);
  const { navigateToTab } = useConsultant();
  const [filter, setFilter] = useState('fresh');
  const [urgentFirst, setUrgentFirst] = useState(true);
  const [composer, setComposer] = useState(null);

  const rows = useMemo(() => {
    const matched = PRIORITY_ROWS.filter((row) => (
      filter === 'status' ? row.tags.includes('attention') : row.tags.includes(filter)
    ));
    if (!urgentFirst) return matched;
    return [...matched].sort((a, b) => Number(b.tags.includes('attention')) - Number(a.tags.includes('attention')));
  }, [filter, urgentFirst]);

  const openTarget = (target) => {
    if (!target) return;
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="px-4 xl:px-6 pb-8 flex flex-col gap-4 min-w-0">
      <section className="grid gap-4 xl:grid-cols-[minmax(440px,1.15fr)_minmax(0,2.35fr)] items-stretch">
        <article
          className="relative overflow-hidden rounded-[28px] min-h-[210px] h-full"
          style={{
            background: 'linear-gradient(135deg, #E7F7EE 0%, #F7FCFA 58%, #FFFFFF 100%)',
            border: `1px solid ${PANEL.line}`,
            boxShadow: PANEL.shadow,
          }}
        >
          <div className="relative h-full flex flex-col justify-between gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-[22px] font-extrabold" style={{ color: PANEL.greenText }}>
                سلام، وقت بخیر
              </h2>
              <p className="text-[13px] leading-6 mt-2 max-w-sm" style={{ color: PANEL.muted }}>
                امروز قدمی کوچک برای موفقیت بیشتر دانش‌آموزانتان بردارید.
              </p>
            </div>
            <div className="flex flex-wrap xl:flex-nowrap gap-2">
              <button
                type="button"
                onClick={() => navigateToTab('planning')}
                className="h-10 px-3.5 rounded-xl text-white text-[13px] font-semibold inline-flex items-center gap-2"
                style={{ background: PANEL.green }}
              >
                <CalendarDays size={15} />
                ثبت جلسه جدید
              </button>
              <button
                type="button"
                onClick={() => navigateToTab('students')}
                className="h-10 px-3.5 rounded-xl text-[13px] font-semibold inline-flex items-center gap-2 bg-white"
                style={{ color: PANEL.greenText, border: '1px solid #CDEAD9' }}
              >
                <Users size={15} />
                مشاهده دانش‌آموزان
              </button>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
          {DESKTOP_STATS.map((stat) => {
            const Icon = STAT_ICONS[stat.icon];
            const tone = TONES[stat.tone];
            return (
              <button
                key={stat.id}
                type="button"
                onClick={() => (stat.tab ? navigateToTab(stat.tab) : openTarget(stat.target))}
                className="rounded-[28px] px-3 py-5 flex flex-col items-center justify-center text-center gap-2 min-h-[168px] hover:-translate-y-0.5 transition-transform"
                style={{ background: tone.bg, boxShadow: PANEL.shadow }}
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/80"
                  style={{ color: tone.fg }}
                >
                  <Icon size={20} />
                </span>
                <span className="text-[32px] leading-none font-extrabold tabular-nums" style={{ color: tone.fg }}>
                  {stat.value}
                </span>
                <span className="text-[12px] leading-5 font-medium" style={{ color: PANEL.muted }}>
                  {stat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.86fr)] items-start">
        <Surface id="priority-students" className="p-4 xl:p-5 min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold" style={{ color: PANEL.greenText }}>
              <Brain size={18} />
              دانش‌آموزان با اولویت ذهنی
            </h2>
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DESKTOP_FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className="h-8 px-3 rounded-full text-[12px] font-medium whitespace-nowrap"
                    style={{
                      background: active ? '#F3F6F4' : 'transparent',
                      color: active ? PANEL.ink : PANEL.muted,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={urgentFirst}
                onClick={() => setUrgentFirst((value) => !value)}
                className="h-8 px-3 rounded-full text-[12px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 text-white"
                style={{ background: urgentFirst ? PANEL.green : '#D5E5DC', color: urgentFirst ? '#fff' : PANEL.green }}
              >
                <ThumbsUp size={13} />
                تازه‌ها فوری
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right border-separate border-spacing-y-1">
              <thead>
                <tr className="text-[11px]" style={{ color: PANEL.muted }}>
                  <th className="font-medium px-3 py-2">نام دانش‌آموز</th>
                  <th className="font-medium px-3 py-2">وضعیت</th>
                  <th className="font-medium px-3 py-2">دلیل نیاز به پیگیری</th>
                  <th className="font-medium px-3 py-2">آخرین جلسه</th>
                  <th className="font-medium px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-sm text-center" style={{ color: PANEL.muted }}>
                      موردی برای این فیلتر نیست.
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-2 font-bold text-[13px]" style={{ color: PANEL.ink }}>
                        <InitialAvatar name={row.name} size={28} />
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ToneBadge tone={row.tone}>{row.status}</ToneBadge>
                    </td>
                    <td className="px-3 py-2.5 text-[13px]" style={{ color: PANEL.muted }}>{row.reason}</td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: PANEL.ink }}>{row.date}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => (
                          row.actionKind === 'plan'
                            ? navigateToTab('planning')
                            : setComposer(row.name)
                        )}
                        className="h-8 px-2.5 rounded-xl text-[12px] font-semibold inline-flex items-center gap-1.5 bg-white whitespace-nowrap"
                        style={{ color: PANEL.greenText, border: '1px solid #D5EBDF' }}
                      >
                        {row.actionKind === 'plan' ? <FileText size={13} /> : <Phone size={13} />}
                        {row.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface id="inbox-queue" className="p-4 xl:p-5">
          <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold mb-3" style={{ color: PANEL.greenText }}>
            <Mail size={18} />
            صف پیام‌های نخوانده
          </h2>
          <ul className="flex flex-col">
            {INBOX_THREADS.map((thread) => (
              <li key={thread.id} className="py-3 flex items-center gap-3" style={{ borderTop: `1px solid ${PANEL.line}` }}>
                <InitialAvatar name={thread.name} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold truncate" style={{ color: PANEL.ink }}>{thread.name}</p>
                    <span className="text-[11px] shrink-0" style={{ color: PANEL.muted }}>{thread.time}</span>
                  </div>
                  <p className="text-[12px] mt-1 truncate" style={{ color: PANEL.muted }}>{thread.preview}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposer(thread.name)}
                  className="h-8 px-3.5 rounded-full text-[12px] font-bold shrink-0"
                  style={{ background: PANEL.greenSoft, color: PANEL.greenText }}
                >
                  پاسخ
                </button>
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.9fr)] items-start">
        <Surface id="today-sessions" className="p-4 xl:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold" style={{ color: PANEL.greenText }}>
              <CalendarDays size={18} />
              برنامه جلسات امروز
            </h2>
            <button
              type="button"
              onClick={() => navigateToTab('planning')}
              className="text-[12px] font-semibold inline-flex items-center gap-1"
              style={{ color: PANEL.greenText }}
            >
              <ChevronLeft size={14} />
              مشاهده همه
            </button>
          </div>
          <ul>
            {todaySessions.isError && (
              <li className="py-3 text-[13px] font-bold text-red-600" style={{ borderTop: `1px solid ${PANEL.line}` }}>
                دریافت جلسات ناموفق بود.
                <button type="button" onClick={() => todaySessions.refetch()} className="mr-2 underline">تلاش دوباره</button>
              </li>
            )}
            {todaySessions.isFetched && !todaySessions.isError && sessionRows.length === 0 && (
              <li className="py-3 text-[13px]" style={{ color: PANEL.muted, borderTop: `1px solid ${PANEL.line}` }}>
                جلسه‌ای برای امروز ثبت نشده است.
              </li>
            )}
            {sessionRows.map((session) => (
              <li
                key={session.id}
                className="grid grid-cols-[4.2rem_1fr_auto] items-center gap-3 py-3"
                style={{ borderTop: `1px solid ${PANEL.line}` }}
              >
                <span className="text-[13px] font-bold tabular-nums" style={{ color: PANEL.ink }}>{session.time}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold truncate" style={{ color: PANEL.ink }}>{session.name}</span>
                  <span className="block text-[12px] truncate" style={{ color: PANEL.muted }}>{session.topic}</span>
                </span>
                <ToneBadge tone={session.tone}>
                  {session.tone === 'green' && <Check size={12} />}
                  {session.tone === 'gray' && <Clock size={12} />}
                  {session.status}
                </ToneBadge>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface
          id="overdue-followups"
          className="p-4 xl:p-5"
          style={{ background: '#FFF7F7', border: '1px solid #F8DADA' }}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-[15px] font-extrabold" style={{ color: '#D64545' }}>
              پیگیری‌های عقب‌افتاده
            </h2>
            <button
              type="button"
              onClick={() => navigateToTab('students')}
              className="text-[12px] font-semibold inline-flex items-center gap-1"
              style={{ color: '#D64545' }}
            >
              <ChevronLeft size={14} />
              مشاهده همه
            </button>
          </div>
          <ul>
            {OVERDUE_ITEMS.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3" style={{ borderTop: '1px solid #F6E0E0' }}>
                <span className="w-9 h-9 rounded-full bg-white text-[#E25B4A] flex items-center justify-center shrink-0">
                  <Phone size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold truncate" style={{ color: PANEL.ink }}>{item.name}</span>
                  <span className="block text-[12px] truncate" style={{ color: PANEL.muted }}>{item.reason}</span>
                </span>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color: '#D64545' }}>{item.date}</span>
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      {composer && (
        <QuickComposer target={composer} onClose={() => setComposer(null)} />
      )}
    </div>
  );
}
