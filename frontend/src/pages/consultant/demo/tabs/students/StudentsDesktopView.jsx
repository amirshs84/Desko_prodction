import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Leaf,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';
import { PANEL } from '../../constants/theme';
import { InitialAvatar } from '../../components/PanelArt';
import { faNum } from '../../lib/format';
import { openStudentProfile } from '../../lib/navigation';
import { DESKTOP_FILTERS, DESKTOP_STUDENTS, STUDENT_STATS } from './catalog';
import { DaysAgo, DetailBlock, ExpandToggle, ProgressTrack, StatusPill } from './pieces';
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

export default function StudentsDesktopView() {
  const navigate = useNavigate();
  const { activeNav } = useConsultant();
  const board = useStudentBoard(DESKTOP_STUDENTS, 'all');
  const [openId, setOpenId] = useState('sahar');
  const students = board.students;
  const designedCounts = !board.liveMode && !board.search && !board.grade && !board.tag && !board.minHours;

  const openProfile = (student) => {
    openStudentProfile(navigate, student.userId || student.id, { fromTab: activeNav || 'students' });
  };

  const scrollMore = (event) => {
    event.currentTarget.closest('.overflow-y-auto')?.scrollBy({ top: 320, behavior: 'smooth' });
  };

  return (
    <div className="px-4 xl:px-6 pb-10 flex flex-col gap-4 min-w-0">
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {STUDENT_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.icon];
          const tone = STAT_TONES[stat.tone];
          return (
            <article
              key={stat.id}
              className="rounded-[22px] px-4 py-3.5 flex items-center gap-3 min-w-0"
              style={{ background: tone.bg }}
            >
              <span
                className="w-11 h-11 rounded-2xl bg-white/80 flex items-center justify-center shrink-0"
                style={{ color: tone.fg }}
              >
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-[26px] leading-none font-extrabold tabular-nums" style={{ color: tone.fg }}>
                  {stat.value}
                </span>
                <span className="block text-[12.5px] font-bold mt-1 truncate" style={{ color: PANEL.ink }}>
                  {stat.label}
                </span>
                {stat.hint ? (
                  <span className="block text-[11px] mt-0.5 truncate" style={{ color: PANEL.muted }}>
                    {stat.hint}
                  </span>
                ) : null}
              </span>
            </article>
          );
        })}
      </section>

      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto rounded-full bg-white px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}
        >
          {DESKTOP_FILTERS.map((item) => {
            const active = board.chip === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => board.setChip(item.id)}
                className="h-9 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap"
                style={{
                  background: active ? '#F4F7F5' : 'transparent',
                  color: active ? PANEL.ink : PANEL.muted,
                  boxShadow: active ? '0 1px 2px rgba(16,60,40,0.06)' : 'none',
                }}
              >
                {item.label}
                <span className="mr-1 tabular-nums">{designedCounts ? item.count : faNum(board.counts[item.id] ?? 0)}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => board.setChip('attention')}
          className="h-10 px-3.5 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1.5 shrink-0"
          style={{
            background: board.chip === 'attention' ? '#E25B4A' : '#FDECEC',
            color: board.chip === 'attention' ? '#fff' : '#E25B4A',
          }}
        >
          <AlertTriangle size={14} />
          نیازمند توجه
        </button>
      </div>

      <AdvancedSearch board={board} />

      {board.waiting ? (
        <p className="text-sm text-center py-16" style={{ color: PANEL.muted }}>در حال بارگذاری فهرست…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: PANEL.muted }}>
          دانش‌آموزی با این فیلتر پیدا نشد.
        </p>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3 items-start">
          {students.map((student) => {
            const open = openId === student.id;
            return (
              <article
                key={student.id}
                className={`rounded-[24px] bg-white p-3.5 min-w-0 ${open ? 'sm:col-span-2' : ''}`}
                style={{ boxShadow: PANEL.shadow, border: `1px solid ${open ? '#BFE5CF' : PANEL.line}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <InitialAvatar name={student.name} size={42} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openProfile(student)}
                        className="block max-w-full text-[14px] font-extrabold truncate text-right"
                        style={{ color: PANEL.ink }}
                        aria-label={`پروفایل ${student.name}`}
                      >
                        {student.name}
                      </button>
                      <p className="text-[11.5px] mt-0.5 truncate" style={{ color: PANEL.muted }}>
                        {student.grade} • {student.track}
                      </p>
                      {student.phone ? (
                        <p className="text-[11px] mt-0.5 truncate" dir="ltr" style={{ color: PANEL.muted }}>{student.phone}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={student.status} />
                    <SelectMark
                      checked={board.selected.has(student.id)}
                      onChange={() => board.toggleOne(student.id)}
                      label={`انتخاب ${student.name}`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[18px] font-extrabold tabular-nums shrink-0" style={{ color: '#128A4C' }}>
                    {faNum(student.percent)}٪
                  </span>
                  <ProgressTrack percent={student.percent} />
                </div>

                <StudentFacts student={student} showColumn={board.showColumn} />

                <div className="mt-3 flex items-center justify-between">
                  {student.daysAgo == null ? <span /> : <DaysAgo days={student.daysAgo} icon={CalendarDays} />}
                  <button
                    type="button"
                    aria-label={`پیام به ${student.name}`}
                    onClick={() => openProfile(student)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ color: PANEL.green, background: PANEL.greenSoft }}
                  >
                    <MessageSquare size={15} />
                  </button>
                </div>

                {open ? <DetailBlock student={student} onOpen={() => openProfile(student)} /> : null}
                <ExpandToggle open={open} onClick={() => setOpenId(open ? null : student.id)} />
              </article>
            );
          })}
        </section>
      )}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={scrollMore}
          className="h-10 px-4 rounded-full bg-white text-[12.5px] font-bold inline-flex items-center gap-1.5"
          style={{ color: PANEL.greenText, boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}
        >
          پایین‌تر بروید
          <ChevronDown size={15} />
        </button>
      </div>
      <BulkActionBar board={board} dock="desktop" />
      <CreateGroupModal board={board} />
    </div>
  );
}
