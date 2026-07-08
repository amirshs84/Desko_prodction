import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBell, IconSearch } from '../components/icons'
import {
  DEFAULT_SUBJECT,
  HOMEWORK_DATA,
  SUBJECT_CONFIGS,
  daysUntilDue,
  priorityMeta,
  urgencyBorderClass,
  type HomeworkItem,
  type Priority,
} from '../lib/homeworkData'
import { toFaDigits } from '../lib/persianDigits'

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed'

type DayGroup = {
  key: string
  label: string
  count: string
  items: HomeworkItem[]
}

function groupByDay(items: HomeworkItem[]): DayGroup[] {
  const map: Record<string, DayGroup> = {}

  for (const item of items) {
    const days = daysUntilDue(item.dueAt)
    let key: string
    let label: string

    if (days < 0) {
      key = 'overdue'
      label = 'عقب‌افتاده'
    } else if (days === 0) {
      key = 'today'
      label = 'امروز'
    } else if (days === 1) {
      key = 'tomorrow'
      label = 'فردا'
    } else if (days <= 7) {
      key = 'week'
      label = 'این هفته'
    } else {
      key = 'later'
      label = 'بعدتر'
    }

    if (!map[key]) map[key] = { key, label, count: '', items: [] }
    map[key].items.push(item)
  }

  const order = ['overdue', 'today', 'tomorrow', 'week', 'later']
  return order
    .filter((k) => map[k])
    .map((k) => ({
      ...map[k],
      count: toFaDigits(map[k].items.length) + ' تکلیف',
    }))
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularProgress({ pct }: { pct: number }) {
  const size = 88
  const sw = 7
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1f2937"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#39FF14"
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 5px rgba(57,255,20,0.75))',
            transition: 'stroke-dashoffset 0.6s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-xl font-extrabold leading-none text-white">
          {toFaDigits(pct)}٪
        </span>
        <span className="text-[9px] leading-none text-[var(--t-ink-4)]">
          پیشرفت هفتگی
        </span>
      </div>
    </div>
  )
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({
  icon,
  value,
  label,
}: {
  icon: string
  value: string | number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--t-edge-2)] bg-black/30 p-3">
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-base font-extrabold leading-none text-white">
        {toFaDigits(String(value))}
      </span>
      <span className="text-center text-[10px] leading-tight text-[var(--t-ink-4)]">
        {label}
      </span>
    </div>
  )
}

// ─── Homework card ────────────────────────────────────────────────────────────

function HomeworkCard({ item }: { item: HomeworkItem }) {
  const days = daysUntilDue(item.dueAt)
  const border = urgencyBorderClass(days, item.priority)
  const subj = SUBJECT_CONFIGS[item.subjectKey] ?? DEFAULT_SUBJECT
  const pm = priorityMeta(item.priority as Priority)

  return (
    <Link
      to={`/homework/${item.id}`}
      className={`flex items-center gap-3 rounded-2xl border bg-[var(--t-card)] px-4 py-3.5 transition active:scale-[0.98] ${border}`}
    >
      {/* Course icon — right in RTL */}
      <div
        className={`shrink-0 h-14 w-14 rounded-2xl border ${subj.bg} ${subj.border} flex items-center justify-center text-2xl font-bold ${subj.color}`}
      >
        {subj.icon}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[var(--t-ink-4)]">
          {item.courseName}
        </p>
        <h3 className="mt-0.5 truncate text-[15px] font-bold text-white">
          {item.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--t-ink-3)]">
          {item.description}
        </p>
        <p className="mt-2 text-[10px] text-[var(--t-ink-4)]">
          {item.attachments.length > 0
            ? `📎 ${toFaDigits(item.attachments.length)} فایل`
            : 'بدون پیوست'}
        </p>
      </div>

      {/* Time + priority badge — left in RTL */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {item.dueTimeDisplay ? (
          <span className="text-sm font-bold text-white">
            {toFaDigits(item.dueTimeDisplay)}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--t-ink-4)]">
            {days === 0 ? 'امروز' : days === 1 ? 'فردا' : `${toFaDigits(Math.round(days))} روز`}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${pm.cls}`}
        >
          {pm.label}
          {item.priority === 'high' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
          )}
        </span>
      </div>
    </Link>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function HomeworkDashboard() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const todayCount = useMemo(
    () =>
      HOMEWORK_DATA.filter(
        (h) => daysUntilDue(h.dueAt) === 0 && h.status !== 'graded',
      ).length,
    [],
  )

  const pendingTotal = useMemo(
    () => HOMEWORK_DATA.filter((h) => h.status === 'assigned').length,
    [],
  )

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return HOMEWORK_DATA.filter(
          (h) => daysUntilDue(h.dueAt) === 0 && h.status !== 'graded',
        )
      case 'upcoming':
        return HOMEWORK_DATA.filter(
          (h) => daysUntilDue(h.dueAt) > 0 && h.status !== 'graded',
        )
      case 'completed':
        return HOMEWORK_DATA.filter((h) => h.status === 'graded')
      default:
        return HOMEWORK_DATA
    }
  }, [activeTab])

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  const tabs: { key: FilterTab; label: string; badge?: number }[] = [
    { key: 'all', label: 'همه تکالیف' },
    { key: 'today', label: 'امروز', badge: todayCount },
    { key: 'upcoming', label: 'آینده' },
    { key: 'completed', label: 'تکمیل‌شده' },
  ]

  return (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white"
    >
      <div
        className="flex-1 overflow-y-auto scroll-touch"
        style={{ paddingBottom: 'max(24px, var(--safe-bottom))' }}
      >
        {/* ── Top header ──────────────────────────────────────── */}
        <div
          className="px-4 pt-4"
          style={{ paddingTop: 'max(16px, var(--safe-top))' }}
        >
          <div className="mb-5 flex items-center justify-between">
            {/* Greeting */}
            <div>
              <p className="text-sm text-[var(--t-ink-3)]">سلام 👋</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                آرمین
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--t-ink-4)]">
                تمرکز. یاد بگیر. رشد کن.
                <span className="inline-block h-2 w-2 rounded-full bg-[#39FF14] shadow-[0_0_6px_rgba(57,255,20,0.9)]" />
              </p>
            </div>

            {/* Icons + avatar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="جستجو"
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--t-edge-2)] text-[var(--t-ink-3)] transition hover:border-white/25"
              >
                <IconSearch className="size-5" />
              </button>
              <button
                type="button"
                aria-label="اعلان‌ها"
                className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--t-edge-2)] text-[var(--t-ink-3)] transition hover:border-white/25"
              >
                <IconBell className="size-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#39FF14] shadow-[0_0_6px_rgba(57,255,20,0.85)]" />
              </button>
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full border border-[#39FF14]/40 bg-gradient-to-br from-[#39FF14]/30 to-[#1a6b08]/30 flex items-center justify-center text-sm font-extrabold text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.25)]">
                آ
              </div>
            </div>
          </div>

          {/* ── Progress + stats ──────────────────────────────── */}
          <div className="mb-5 flex items-center gap-4 rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] px-4 py-4">
            <CircularProgress pct={75} />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <StatBox icon="⚡" value="17" label="روز پیاپی" />
              <StatBox icon="🎯" value={pendingTotal} label="باقی‌مانده" />
              <StatBox icon="⭐" value="820" label="امتیاز" />
            </div>
          </div>

          {/* ── Tab navigation ────────────────────────────────── */}
          <div className="mb-4 flex gap-2 overflow-x-auto scroll-touch pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const on = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    on
                      ? 'border-[#39FF14]/55 bg-[#39FF14]/12 text-[#bdfcbd] shadow-[0_0_20px_rgba(57,255,20,0.18)]'
                      : 'border-[var(--t-edge-2)] bg-[var(--t-card)] text-[var(--t-ink-2)] hover:border-white/20'
                  }`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        on
                          ? 'bg-[#39FF14]/30 text-[#bdfcbd]'
                          : 'bg-white/10 text-[var(--t-ink-3)]'
                      }`}
                    >
                      {toFaDigits(tab.badge)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Task groups ──────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-4">
          {groups.map((group) => (
            <section key={group.key}>
              {/* Section header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-0.5 rounded-full ${
                      group.key === 'overdue'
                        ? 'bg-red-500'
                        : group.key === 'today'
                          ? 'bg-[#39FF14]'
                          : group.key === 'tomorrow'
                            ? 'bg-yellow-400'
                            : 'bg-[var(--t-ink-4)]'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--t-ink-3)]">
                    {group.label}
                  </span>
                </div>
                <span className="text-xs text-[var(--t-ink-4)]">
                  {group.count}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <HomeworkCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="text-5xl">🎉</div>
              <p className="mt-3 text-sm font-bold text-[var(--t-ink-2)]">
                هیچ تکلیفی در این بخش وجود ندارد
              </p>
              <p className="mt-1 text-xs text-[var(--t-ink-4)]">
                عالیه! وقت استراحت داری.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
