import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock,
  Leaf,
  LogOut,
  MoreHorizontal,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';
import { PANEL } from '../../constants/theme';
import { InitialAvatar } from '../../components/PanelArt';
import { consultantIdentity, faNum } from '../../lib/format';
import { openStudentProfile } from '../../lib/navigation';
import { performLogout } from '../../../../../utils/auth';
import { MOBILE_FILTERS, MOBILE_STUDENTS, STUDENT_STATS } from './catalog';
import { DaysAgo, DetailBlock, ProgressTrack } from './pieces';
import { useStudentBoard } from './studentBoard';
import { AdvancedSearch, BulkActionBar, CreateGroupModal, SelectMark, StudentFacts } from './studentTools';

const STAT_ICONS = {
  leaf: Leaf,
  trend: TrendingUp,
  calendar: CalendarDays,
  alert: AlertTriangle,
};

const STAT_TONES = {
  green: { bg: '#E7F7EE', fg: '#128A4C' },
  blue: { bg: '#E8F2FC', fg: '#3B82F6' },
  coral: { bg: '#FDECEC', fg: '#E25B4A' },
};

const FILTER_ICONS = {
  alert: AlertTriangle,
  trophy: Trophy,
  users: Users,
  star: Star,
};

export default function StudentsMobileView() {
  const navigate = useNavigate();
  const { activeNav } = useConsultant();
  const board = useStudentBoard(MOBILE_STUDENTS, 'top');
  const identity = consultantIdentity();
  const [openId, setOpenId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const students = board.students;

  useEffect(() => {
    if (!accountOpen && !menuId) return undefined;
    const onPointer = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
      if (!event.target.closest?.('[data-student-menu]')) setMenuId(null);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [accountOpen, menuId]);

  const openProfile = (student) => {
    openStudentProfile(navigate, student.userId || student.id, { fromTab: activeNav || 'students' });
  };

  const logout = async () => {
    setAccountOpen(false);
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  return (
    <div className="px-4 sm:px-6 pb-6 max-w-3xl mx-auto w-full">
      <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3 flex items-center justify-between gap-3" style={{ background: 'rgba(243,246,244,0.94)', backdropFilter: 'blur(14px)' }}>
        <div className="relative min-w-0" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            className="flex items-center gap-2 min-w-0 text-right"
            aria-expanded={accountOpen}
          >
            <InitialAvatar name={identity.full} size={40} />
            <span className="min-w-0">
              <span className="flex items-center gap-1">
                <span className="text-[14px] font-extrabold truncate" style={{ color: PANEL.ink }}>{identity.full}</span>
                <ChevronDown size={14} color={PANEL.muted} />
              </span>
              <span className="block text-[11px]" style={{ color: PANEL.muted }}>{identity.role}</span>
            </span>
          </button>
          {accountOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] w-40 rounded-2xl bg-white p-1.5 shadow-xl z-30"
              style={{ border: `1px solid ${PANEL.line}` }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} />
                خروج از حساب
              </button>
            </div>
          )}
        </div>
        <h1 className="inline-flex items-center gap-1.5 text-[18px] font-extrabold shrink-0" style={{ color: PANEL.greenText }}>
          دانش‌آموزان
          <Users size={20} />
        </h1>
      </header>

      <section className="grid grid-cols-4 gap-2">
        {STUDENT_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.icon];
          const tone = STAT_TONES[stat.tone];
          return (
            <article
              key={stat.id}
              className="rounded-2xl px-1.5 py-2.5 flex flex-col items-center text-center gap-1 min-w-0"
              style={{ background: tone.bg }}
            >
              <Icon size={16} color={tone.fg} />
              <span className="text-[18px] leading-none font-extrabold tabular-nums" style={{ color: tone.fg }}>
                {stat.value}
              </span>
              <span className="text-[10px] font-semibold leading-4" style={{ color: PANEL.ink }}>{stat.label}</span>
            </article>
          );
        })}
      </section>

      <div className="mt-3">
        <AdvancedSearch board={board} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MOBILE_FILTERS.map((item) => {
          const Icon = FILTER_ICONS[item.icon];
          const active = board.chip === item.id;
          const attention = item.id === 'attention';
          let background = '#fff';
          let color = PANEL.muted;
          if (active && attention) {
            background = '#E25B4A';
            color = '#fff';
          } else if (active) {
            background = PANEL.green;
            color = '#fff';
          } else if (attention) {
            background = '#FDECEC';
            color = '#E25B4A';
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => board.setChip(item.id)}
              className="h-9 px-3 rounded-full text-[12px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 shrink-0"
              style={{
                background,
                color,
                border: active || attention ? 'none' : `1px solid ${PANEL.line}`,
              }}
            >
              <Icon size={13} />
              {item.label}
            </button>
          );
        })}
      </div>

      {board.waiting ? (
        <p className="text-sm text-center py-14" style={{ color: PANEL.muted }}>در حال بارگذاری فهرست…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-center py-14" style={{ color: PANEL.muted }}>دانش‌آموزی با این فیلتر پیدا نشد.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {students.map((student) => {
            const open = openId === student.id;
            return (
              <li key={student.id}>
                <article
                  className="rounded-[22px] bg-white p-3"
                  style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}
                >
                  <div className="flex items-center gap-2">
                    <SelectMark
                      checked={board.selected.has(student.id)}
                      onChange={() => board.toggleOne(student.id)}
                      label={`انتخاب ${student.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => openProfile(student)}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ color: '#C5D0CB' }}
                      aria-label={`پروفایل ${student.name}`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <InitialAvatar name={student.name} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-extrabold truncate" style={{ color: PANEL.ink }}>{student.name}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: PANEL.muted }}>
                        {student.grade} • {student.track}
                      </p>
                      {student.phone ? (
                        <p className="text-[11px] truncate" dir="ltr" style={{ color: PANEL.muted }}>{student.phone}</p>
                      ) : null}
                    </div>
                    <div className="w-[7.5rem] shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-extrabold tabular-nums" style={{ color: '#128A4C' }}>
                          {faNum(student.percent)}٪
                        </span>
                        <ProgressTrack percent={student.percent} />
                      </div>
                      <div className="mt-1.5">
                        {student.daysAgo == null ? null : <DaysAgo days={student.daysAgo} icon={Clock} />}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {student.rank ? (
                        <span
                          className="w-8 h-8 rounded-full text-white text-[12px] font-extrabold inline-flex items-center justify-center relative"
                          style={{ background: '#1F9D5A' }}
                        >
                          {faNum(student.rank)}
                          <Star size={9} className="absolute -top-1 -left-1 fill-[#F6C445] text-[#F6C445]" />
                        </span>
                      ) : (
                        <StatusPillCompact status={student.status} />
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : student.id)}
                        className="text-[10px] font-bold inline-flex items-center gap-0.5"
                        style={{ color: PANEL.greenText }}
                        aria-expanded={open}
                      >
                        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
                        جزئیات
                      </button>
                      <div className="relative" data-student-menu>
                        <button
                          type="button"
                          aria-label="گزینه‌های بیشتر"
                          onClick={() => setMenuId(menuId === student.id ? null : student.id)}
                          className="w-7 h-6 flex items-center justify-center"
                          style={{ color: PANEL.muted }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuId === student.id && (
                          <div
                            className="absolute left-0 top-full z-20 w-36 rounded-xl bg-white p-1 shadow-xl"
                            style={{ border: `1px solid ${PANEL.line}` }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuId(null);
                                openProfile(student);
                              }}
                              className="w-full text-right px-2.5 py-2 rounded-lg text-[12px] font-semibold"
                              style={{ color: PANEL.ink }}
                            >
                              مشاهده کامل
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <StudentFacts student={student} showColumn={board.showColumn} />
                  {open ? <DetailBlock student={student} onOpen={() => openProfile(student)} /> : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
      <BulkActionBar board={board} />
      <CreateGroupModal board={board} />
    </div>
  );
}

function StatusPillCompact({ status }) {
  const attention = status === 'attention';
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: attention ? '#FDECEC' : '#E7F8EE', color: attention ? '#E25B4A' : '#128A4C' }}
    >
      {attention ? 'توجه' : 'فعال'}
    </span>
  );
}
