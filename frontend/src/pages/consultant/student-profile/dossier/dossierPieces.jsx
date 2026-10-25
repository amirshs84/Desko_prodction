import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Copy,
  FileText,
  FolderOpen,
  GraduationCap,
  IdCard,
  MapPin,
  Medal,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Phone,
  StickyNote,
  Target,
  Trophy,
  UserRound,
  Mail,
} from 'lucide-react';
import { PANEL } from '../../demo/constants/theme';
import { SESSION_STATUSES } from '../../demo/lib/counselingSessions';
import { faNum } from '../../demo/lib/format';
import { DOSSIER_TABS } from './dossierModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';
const CARD = 'bg-white rounded-[22px] border border-[#E5EEE9] shadow-[0_10px_28px_rgba(18,70,45,0.05)]';

const TAB_ICONS = {
  overview: UserRound,
  calendar: CalendarDays,
  'actual-calendar': CalendarCheck,
  analytics: BarChart3,
  interactions: MessagesSquare,
  identity: IdCard,
  records: GraduationCap,
  sessions: MessageSquare,
  reports: FileText,
  notes: StickyNote,
  files: FolderOpen,
};

export function StudentPortrait({ className = 'w-[72px] h-[72px]' }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} shrink-0`} aria-hidden="true">
      <circle cx="60" cy="60" r="58" fill="#E7F3EC" />
      <ellipse cx="60" cy="78" rx="34" ry="28" fill="#D7E8F8" />
      <ellipse cx="60" cy="54" rx="24" ry="26" fill="#F3D2BE" />
      <path d="M36 50c2-20 14-28 24-28s22 8 24 28c-8 4-16 6-24 6s-16-2-24-6z" fill="#3E342F" />
      <path d="M38 62c6 10 38 10 44 0" fill="#3E342F" />
      <circle cx="51" cy="56" r="2.1" fill="#2C241F" />
      <circle cx="69" cy="56" r="2.1" fill="#2C241F" />
      <path d="M54 68c4 3 9 3 13 0" fill="none" stroke="#C47B6A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CardTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold min-w-0" style={{ color: PANEL.ink }}>
        <Icon size={16} color={PANEL.green} />
        <span className="truncate">{children}</span>
      </h2>
      {action}
    </div>
  );
}

function TextButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] font-bold inline-flex items-center gap-1 ${FOCUS}`}
      style={{ color: PANEL.greenText }}
    >
      {children}
    </button>
  );
}

export function DossierNotice({ notice }) {
  if (!notice) return null;
  return (
    <p role="status" className="rounded-2xl bg-[#E6F6EC] text-[#0F6A49] text-sm font-bold px-3 py-2">
      {notice}
    </p>
  );
}

export function DossierHero({ dossier, onBack }) {
  const active = dossier.status !== 'attention';
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0 text-right">
          <h1 className="text-[22px] sm:text-[26px] font-extrabold truncate" style={{ color: PANEL.ink }}>
            {dossier.displayName}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: PANEL.muted }}>
            {dossier.grade} • {dossier.track}
          </p>
          <p className="mt-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold"
              style={{ background: active ? '#E7F8EE' : '#FDECEC', color: active ? '#128A4C' : '#E25B4A' }}
            >
              {active ? <Check size={13} /> : <AlertTriangle size={13} />}
              {active ? 'فعال' : 'نیازمند توجه'}
            </span>
          </p>
        </div>
        <StudentPortrait className="w-16 h-16 sm:w-[74px] sm:h-[74px]" />
      </div>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={`h-10 px-3 rounded-2xl bg-white border border-[#E5EEE9] text-sm font-bold inline-flex items-center gap-1 shrink-0 ${FOCUS}`}
          style={{ color: PANEL.ink }}
        >
          بازگشت
          <ChevronLeft size={16} />
        </button>
      ) : null}
    </div>
  );
}

const STATS = [
  { key: 'gpaLabel', label: 'معدل کل', icon: BarChart3 },
  { key: 'classRank', label: 'رتبه کلاسی', icon: Trophy },
  { key: 'absenceLabel', label: 'تعداد غیبت', icon: CalendarDays },
  { key: 'nationalRank', label: 'رتبه کشوری', icon: Medal },
];

export function DossierStats({ dossier, columns = 'grid-cols-2 xl:grid-cols-4' }) {
  return (
    <section className={`grid gap-3 ${columns}`}>
      {STATS.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.key} className={`${CARD} px-4 py-3 flex items-center justify-between gap-3 min-w-0`}>
            <span className="min-w-0">
              <span className="block text-[12px]" style={{ color: PANEL.muted }}>{item.label}</span>
              <span className="block text-[22px] font-extrabold tabular-nums mt-1 truncate" style={{ color: PANEL.green }}>
                {dossier[item.key]}
              </span>
            </span>
            <span className="w-10 h-10 rounded-2xl bg-[#E7F6EC] text-[#128A4C] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
          </article>
        );
      })}
    </section>
  );
}

export function DossierTabs({ dossier }) {
  return (
    <div className={`${CARD} p-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`} role="tablist" aria-label="بخش‌های پروفایل">
      <div className="flex items-center gap-1 min-w-max">
        {DOSSIER_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const selected = dossier.tab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => dossier.setTab(tab.id)}
              className={`h-10 px-3 rounded-xl text-[13px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${FOCUS}`}
              style={{
                background: selected ? '#E7F6EC' : 'transparent',
                color: selected ? PANEL.green : PANEL.muted,
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F0F5F2] last:border-0 min-w-0">
      <span className="text-[13px] shrink-0" style={{ color: PANEL.muted }}>{label}</span>
      <span className="text-[13.5px] font-bold text-left truncate" style={{ color: PANEL.ink }}>{value}</span>
    </div>
  );
}

function LevelBadge({ level }) {
  const excellent = level === 'عالی';
  return (
    <span
      className="min-w-[3.2rem] text-center rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{
        background: excellent ? '#E7F8EE' : '#F8F4D8',
        color: excellent ? '#128A4C' : '#8A7420',
      }}
    >
      {level}
    </span>
  );
}

function GradesCard({ dossier }) {
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={BarChart3} action={<TextButton onClick={() => dossier.setTab('records')}>مشاهده جزئیات</TextButton>}>
        وضعیت تحصیلی
      </CardTitle>
      <ul>
        {dossier.subjects.map((item) => (
          <li key={item.name} className="flex items-center gap-2 py-2 border-b border-[#F0F5F2] last:border-0">
            <span className="flex-1 text-[13.5px] font-semibold truncate" style={{ color: PANEL.ink }}>{item.name}</span>
            <span className="tabular-nums font-extrabold text-[14px]" style={{ color: PANEL.ink }}>{item.scoreLabel}</span>
            <LevelBadge level={item.level} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummaryCard({ dossier }) {
  const cells = [
    { label: 'معدل کل', value: dossier.gpaLabel, icon: BarChart3 },
    { label: 'رتبه کلاسی', value: dossier.classRank, icon: Trophy },
    { label: 'رتبه کشوری', value: dossier.nationalRank, icon: Medal },
    { label: 'تعداد غیبت', value: dossier.absenceLabel.replace(' جلسه', ''), icon: CalendarDays },
  ];
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={ClipboardList} action={<TextButton onClick={() => dossier.setTab('analytics')}>مشاهده گزارش کامل</TextButton>}>
        خلاصه عملکرد
      </CardTitle>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((cell) => {
          const Icon = cell.icon;
          return (
            <div key={cell.label} className="rounded-2xl bg-[#F7FBF8] px-3 py-2.5 min-w-0">
              <span className="flex items-center justify-between gap-1 text-[11px]" style={{ color: PANEL.muted }}>
                {cell.label}
                <Icon size={14} color={PANEL.green} />
              </span>
              <span className="block mt-1 text-[18px] font-extrabold tabular-nums truncate" style={{ color: PANEL.green }}>
                {cell.value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const IDENTITY_FIELDS = [
  ['name', 'نام و نام خانوادگی'],
  ['nationalId', 'کد ملی'],
  ['birth', 'تاریخ تولد'],
  ['gender', 'جنسیت'],
  ['marital', 'وضعیت تاهل'],
  ['enrollment', 'نحوه ثبت نام'],
];

function IdentityCard({ dossier }) {
  const editing = dossier.editing === 'identity';
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle
        icon={UserRound}
        action={editing ? (
          <span className="inline-flex items-center gap-2">
            <TextButton onClick={dossier.cancelEdit}>انصراف</TextButton>
            <TextButton onClick={dossier.saveEdit}>ذخیره</TextButton>
          </span>
        ) : (
          <TextButton onClick={() => dossier.beginEdit('identity')}>
            <Pencil size={13} />
            ویرایش
          </TextButton>
        )}
      >
        مشخصات فردی
      </CardTitle>
      {editing ? (
        <div className="flex flex-col gap-2">
          {IDENTITY_FIELDS.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-[12px]" style={{ color: PANEL.muted }}>
              {label}
              <input
                value={dossier.draft[key]}
                onChange={(event) => dossier.setDraft({ ...dossier.draft, [key]: event.target.value })}
                className={`h-10 rounded-xl border border-[#E5EEE9] px-3 text-[13px] font-bold bg-[#F8FBF9] ${FOCUS}`}
                style={{ color: PANEL.ink }}
              />
            </label>
          ))}
        </div>
      ) : (
        IDENTITY_FIELDS.map(([key, label]) => (
          <FieldRow key={key} label={label} value={dossier.identity[key]} />
        ))
      )}
    </section>
  );
}

function NoteCard({ dossier }) {
  const editing = dossier.editing === 'note';
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle
        icon={Pencil}
        action={editing ? (
          <span className="inline-flex items-center gap-2">
            <TextButton onClick={dossier.cancelEdit}>انصراف</TextButton>
            <TextButton onClick={dossier.saveEdit}>ذخیره</TextButton>
          </span>
        ) : (
          <TextButton onClick={() => dossier.beginEdit('note')}>
            <Pencil size={13} />
            ویرایش
          </TextButton>
        )}
      >
        توضیحات مشاور
      </CardTitle>
      {editing ? (
        <textarea
          value={dossier.draft}
          onChange={(event) => dossier.setDraft(event.target.value)}
          rows={4}
          className={`w-full rounded-2xl border border-[#E5EEE9] bg-[#F8FBF9] p-3 text-[13px] leading-6 ${FOCUS}`}
          style={{ color: PANEL.ink }}
        />
      ) : (
        <p className="text-[13px] leading-7" style={{ color: PANEL.muted }}>{dossier.note}</p>
      )}
    </section>
  );
}

function GoalsCard({ dossier }) {
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={Target} action={<TextButton onClick={() => dossier.setTab('notes')}>مشاهده همه</TextButton>}>
        اهداف و برنامه‌ها
      </CardTitle>
      <ul className="flex flex-col gap-3">
        {dossier.goals.map((goal) => {
          const waiting = goal.state === 'waiting';
          return (
            <li key={goal.id} className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="font-bold truncate" style={{ color: PANEL.ink }}>{goal.title}</span>
                <span className="tabular-nums font-extrabold shrink-0" style={{ color: PANEL.green }}>{`${faNum(goal.percent)}٪`}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-[#E7F6EC] overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-[#1F9D5A]" style={{ width: `${goal.percent}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span style={{ color: PANEL.muted }}>{goal.deadline}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
                  style={{ background: waiting ? '#F4F6F5' : '#E7F8EE', color: waiting ? PANEL.muted : '#128A4C' }}
                >
                  <ChevronLeft size={12} />
                  {waiting ? 'در انتظار' : 'در حال انجام'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ContactCard({ dossier }) {
  const rows = [
    { icon: Phone, label: 'موبایل', value: `+${dossier.phone}`, copy: dossier.phone },
    { icon: Mail, label: 'ایمیل', value: dossier.email },
    { icon: MapPin, label: 'آدرس', value: dossier.address },
    { icon: Phone, label: 'تلفن ثابت', value: dossier.landline },
  ];
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={Phone}>اطلاعات تماس</CardTitle>
      <ul>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.label} className="flex items-center gap-2 py-2.5 border-b border-[#F0F5F2] last:border-0 min-w-0">
              <Icon size={15} color={PANEL.green} className="shrink-0" />
              <span className="text-[12.5px] shrink-0" style={{ color: PANEL.muted }}>{row.label}</span>
              <span className="flex-1 text-[12.5px] font-bold text-left truncate" style={{ color: PANEL.ink }} dir="ltr">{row.value}</span>
              {row.copy ? (
                <button
                  type="button"
                  aria-label={`کپی ${row.label}`}
                  onClick={() => dossier.copyPhone(row.copy)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${FOCUS}`}
                  style={{ color: PANEL.green }}
                >
                  <Copy size={13} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ParentsCard({ dossier }) {
  const people = [
    { role: 'نام پدر', name: dossier.father, phone: dossier.fatherPhone },
    { role: 'نام مادر', name: dossier.mother, phone: dossier.motherPhone },
  ];
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={UserRound}>اطلاعات والدین</CardTitle>
      <ul>
        {people.map((person) => (
          <li key={person.role} className="py-2.5 border-b border-[#F0F5F2] last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px]" style={{ color: PANEL.muted }}>{person.role}</span>
              <span className="text-[13.5px] font-bold" style={{ color: PANEL.ink }}>{person.name}</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span className="text-[12.5px] font-bold tabular-nums" style={{ color: PANEL.ink }} dir="ltr">{person.phone}</span>
              <button
                type="button"
                aria-label={`کپی شماره ${person.role}`}
                onClick={() => dossier.copyPhone(person.phone)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${FOCUS}`}
                style={{ color: PANEL.green }}
              >
                <Copy size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SchoolCard({ dossier }) {
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={GraduationCap}>مشخصات تحصیلی</CardTitle>
      <FieldRow label="رشته" value={dossier.track} />
      <FieldRow label="پایه" value={dossier.grade.replace('پایه ', '')} />
      <FieldRow label="مدرسه" value={dossier.school} />
      <FieldRow label="سال تحصیلی" value={dossier.year} />
    </section>
  );
}

export function DossierOverview({ dossier }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(230px,0.92fr)_minmax(0,1.35fr)_minmax(210px,0.86fr)] gap-3 items-start">
      <div className="flex flex-col gap-3 min-w-0">
        <GradesCard dossier={dossier} />
        <SummaryCard dossier={dossier} />
      </div>
      <div className="flex flex-col gap-3 min-w-0">
        <IdentityCard dossier={dossier} />
        <NoteCard dossier={dossier} />
        <GoalsCard dossier={dossier} />
      </div>
      <div className="flex flex-col gap-3 min-w-0">
        <ContactCard dossier={dossier} />
        <ParentsCard dossier={dossier} />
        <SchoolCard dossier={dossier} />
      </div>
    </div>
  );
}

export function DossierStack({ dossier }) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <GradesCard dossier={dossier} />
      <SummaryCard dossier={dossier} />
      <IdentityCard dossier={dossier} />
      <NoteCard dossier={dossier} />
      <GoalsCard dossier={dossier} />
      <ContactCard dossier={dossier} />
      <ParentsCard dossier={dossier} />
      <SchoolCard dossier={dossier} />
    </div>
  );
}

export function DossierList({ dossier }) {
  const current = DOSSIER_TABS.find((tab) => tab.id === dossier.tab);
  const Icon = TAB_ICONS[dossier.tab] || FileText;
  const sessions = dossier.tab === 'sessions' ? dossier.sessionApi : null;
  return (
    <section className={`${CARD} p-4`}>
      <CardTitle icon={Icon}>{current?.label}</CardTitle>
      {sessions && (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            sessions.save();
          }}
        >
          <label className="block min-w-0">
            <span className="text-[11px] font-bold" style={{ color: PANEL.muted }}>موضوع</span>
            <input
              aria-label="موضوع جلسه"
              value={sessions.title}
              onChange={(event) => sessions.setTitle(event.target.value)}
              placeholder="مثلاً مدیریت استرس"
              className={`mt-1 w-full h-10 rounded-xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold" style={{ color: PANEL.muted }}>زمان</span>
            <input
              aria-label="زمان جلسه"
              type="datetime-local"
              value={sessions.when}
              onChange={(event) => sessions.setWhen(event.target.value)}
              className={`mt-1 w-full h-10 rounded-xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
            />
          </label>
          <button
            type="submit"
            disabled={sessions.saving}
            className={`h-10 px-3 rounded-xl text-sm font-extrabold text-[#0F6A49] bg-[#E7F6EC] disabled:opacity-50 ${FOCUS}`}
          >
            {sessions.saving ? 'در حال ثبت…' : 'ثبت جلسه'}
          </button>
          {sessions.error && (
            <p className="sm:col-span-3 text-xs font-bold text-red-600">{sessions.error}</p>
          )}
          {sessions.loading && (
            <p className="sm:col-span-3 text-xs" style={{ color: PANEL.muted }}>در حال دریافت جلسات…</p>
          )}
          {sessions.failed && (
            <button type="button" onClick={() => sessions.refetch()} className="sm:col-span-3 text-xs font-bold text-red-600 text-right">
              دریافت جلسات ناموفق بود. تلاش دوباره
            </button>
          )}
        </form>
      )}
      <ul>
        {sessions && !sessions.loading && !sessions.failed && dossier.list.length === 0 && (
          <li className="py-3 text-[13px]" style={{ color: PANEL.muted }}>جلسه‌ای ثبت نشده است.</li>
        )}
        {dossier.list.map((item) => (
          <li key={item.id} className="py-3 border-b border-[#F0F5F2] last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold" style={{ color: PANEL.ink }}>{item.title}</p>
                <p className="text-[12.5px] mt-1" style={{ color: PANEL.muted }}>{item.detail}</p>
              </div>
              {item.live && sessions && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    aria-label={`وضعیت ${item.title}`}
                    value={item.statusKey}
                    onChange={(event) => sessions.changeStatus(item.id, event.target.value)}
                    className={`h-9 rounded-xl border border-[#E5EEE9] px-2 text-[12px] font-bold ${FOCUS}`}
                  >
                    {SESSION_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => sessions.remove(item.id)}
                    className={`h-9 px-2 rounded-xl text-[12px] font-bold text-red-600 ${FOCUS}`}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
