import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft, IconPaperclip, IconSearch } from '../components/icons'
import { useSelectedDay } from '../context/SelectedDayContext'
import { toFaDigits } from '../lib/persianDigits'

type HomeworkStatus = 'assigned' | 'submitted' | 'graded'

type HomeworkFilter = 'all' | 'in_progress' | 'completed'

type Attachment = { id: string; name: string; href: string }

type HomeworkItem = {
  id: string
  courseName: string
  title: string
  descriptionSnippet: string
  descriptionFull: string
  /** برای محاسبهٔ فوریت موعد */
  dueAt: string
  /** برچسب نمایشی از پیش تعریف‌شده */
  dueDisplay: string
  status: HomeworkStatus
  attachments: Attachment[]
}

function daysUntilDue(dueIso: string, now: Date): number {
  const due = new Date(dueIso)
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return (startDue.getTime() - startNow.getTime()) / (24 * 60 * 60 * 1000)
}

function dueTone(days: number): 'muted' | 'warn' | 'danger' {
  if (days < 0) return 'danger'
  if (days < 3) return 'warn'
  return 'muted'
}

const MOCK_HOMEWORK: HomeworkItem[] = [
  {
    id: 'hw-1',
    courseName: 'ریاضیات گسسته',
    title: 'حل تمرینات فصل ۳: گراف',
    descriptionSnippet:
      'مسائل ۱ تا ۸ را با استفاده از مفاهیم مسیر، دور و همبندی حل کنید. تحویل به صورت PDF.',
    descriptionFull:
      'مسائل ۱ تا ۸ را با استفاده از مفاهیم مسیر، دور و همبندی حل کنید. برای هر سوال فرضیات و نتیجه را به صورت رسمی بنویسید. تحویل به صورت یک فایل PDF با نام‌گذاری شماره‌دانشجویی-فصل۳.',
    dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    dueDisplay: `فردا، ساعت ${toFaDigits('23:59')}`,
    status: 'assigned',
    attachments: [
      { id: 'a1', name: 'صورت‌سوالات.pdf', href: '#' },
      { id: 'a2', name: 'جزوهٔ گراف.pdf', href: '#' },
    ],
  },
  {
    id: 'hw-2',
    courseName: 'شیمی آلی',
    title: 'گزارش آزمایشگاه استخراج کافئین',
    descriptionSnippet: 'گزارش کامل با نمودار TLC و بحث خطاهای آزمایشی.',
    descriptionFull:
      'گزارش را شامل مقدمه، روش کار، نتایج (جدول بازده)، نمودار TLC اسکن‌شده و بحث خطاهای آزمایشی بنویسید. ارجاع به منابع معتبر الزامی است.',
    dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    dueDisplay: `${toFaDigits('15')} خرداد`,
    status: 'graded',
    attachments: [{ id: 'a3', name: 'راهنمای گزارش.docx', href: '#' }],
  },
  {
    id: 'hw-3',
    courseName: 'طراحی الگوریتم',
    title: 'پیاده‌سازی مسئلهٔ کوله‌پشتی با DP',
    descriptionSnippet: 'کد به زبان دلخواه + تحلیل پیچیدگی زمانی و حافظه.',
    descriptionFull:
      'مسئلهٔ کوله‌پشتی ۰/۱ را با برنامه‌نویسی پویا حل کنید. تحویل: سورس کد، توضیح حالت‌ها و انتقال‌ها، و تحلیل O(nW).',
    dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDisplay: 'overdue 🔴',
    status: 'assigned',
    attachments: [{ id: 'a4', name: 'ورودی‌های نمونه.zip', href: '#' }],
  },
  {
    id: 'hw-4',
    courseName: 'فیزیک ۲',
    title: 'تمرین مداری RLC',
    descriptionSnippet: 'محاسبهٔ پاسخ فرکانسی و رسم بُردار فاز.',
    descriptionFull:
      'با توجه به مدار داده‌شده، امپدانس، فرکانس تشدید و توان تحویلی را محاسبه و بُردار فاز را رسم کنید.',
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDisplay: `${toFaDigits('3')} روز دیگر — ساعت ${toFaDigits('20:00')}`,
    status: 'submitted',
    attachments: [{ id: 'a5', name: 'داده‌های مدار.pdf', href: '#' }],
  },
]

function statusTagMeta(status: HomeworkStatus): { label: string; className: string } {
  switch (status) {
    case 'assigned':
      return {
        label: 'جدید',
        className: 'border-sky-500/60 bg-sky-500/15 text-sky-300',
      }
    case 'submitted':
      return {
        label: 'تحویل داده شده',
        className: 'border-[var(--t-edge-2)] bg-white/5 text-[var(--t-ink-3)]',
      }
    case 'graded':
      return {
        label: 'نمره‌دهی شده',
        className: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300',
      }
  }
}

export function HomeworkList() {
  const { selected } = useSelectedDay()
  const jy = selected.jy
  const [filter, setFilter] = useState<HomeworkFilter>('all')
  const [items, setItems] = useState<HomeworkItem[]>(MOCK_HOMEWORK)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pickedFiles, setPickedFiles] = useState<Record<string, string | undefined>>({})
  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    return items.filter((h) => {
      if (filter === 'all') return true
      if (filter === 'completed') return h.status === 'graded'
      return h.status !== 'graded'
    })
  }, [items, filter])

  const toggleExpanded = (id: string) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }))
  }

  const turnIn = (id: string) => {
    setItems((rows) =>
      rows.map((r) => (r.id === id && r.status === 'assigned' ? { ...r, status: 'submitted' as const } : r)),
    )
    setExpanded((p) => ({ ...p, [id]: true }))
  }

  const onPickFile = (id: string, name: string | undefined) => {
    setPickedFiles((p) => ({ ...p, [id]: name }))
  }

  const filters: { key: HomeworkFilter; label: string }[] = [
    { key: 'all', label: 'همهٔ تکالیف' },
    { key: 'in_progress', label: 'در حال انجام' },
    { key: 'completed', label: 'تکمیل‌شده' },
  ]

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col bg-black text-[var(--t-ink)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--t-edge)] bg-black/90 backdrop-blur-md"
        style={{ paddingTop: 'max(var(--safe-top), 8px)' }}
      >
        <div
          className="flex items-center gap-2 py-2"
          style={{
            paddingInlineStart: 'var(--cal-pad-x)',
            paddingInlineEnd: 'var(--cal-pad-x-end)',
          }}
        >
          <Link
            to={`/year/${jy}`}
            aria-label="بازگشت به تقویم"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)] transition hover:border-[#39FF14]/45"
          >
            <IconArrowLeft className="size-6 rtl:rotate-180" />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-base font-bold tracking-tight sm:text-lg">تکالیف</div>
            <div className="truncate text-xs text-[var(--t-ink-3)]">نمای دانش‌آموز — دمو</div>
          </div>

          <button
            type="button"
            aria-label="جستجو"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink-3)]"
          >
            <IconSearch className="size-5" />
          </button>
        </div>

        <div
          className="flex gap-2 overflow-x-auto scroll-touch pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingInlineStart: 'var(--cal-pad-x)',
            paddingInlineEnd: 'var(--cal-pad-x-end)',
          }}
        >
          {filters.map((f) => {
            const on = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  on
                    ? 'border-[color:#39FF14]/55 bg-[#39FF14]/12 text-[#bdfcbd] shadow-[0_0_20px_rgba(57,255,20,0.18)]'
                    : 'border-[var(--t-edge-2)] bg-[var(--t-card)] text-[var(--t-ink-2)] hover:border-white/20'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto scroll-touch py-4"
        style={{
          paddingInlineStart: 'var(--cal-pad-x)',
          paddingInlineEnd: 'var(--cal-pad-x-end)',
          paddingBottom: 'max(16px,var(--safe-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {filtered.map((hw) => {
            const d = daysUntilDue(hw.dueAt, now)
            const tone = dueTone(d)
            const dueClass =
              tone === 'danger'
                ? 'text-red-400'
                : tone === 'warn'
                  ? 'text-orange-400'
                  : 'text-[var(--t-ink-3)]'
            const duePrefix =
              tone === 'danger' ? '' : tone === 'warn' ? '🔥 ' : '🗓️ '
            const tag = statusTagMeta(hw.status)
            const isOpen = !!expanded[hw.id]

            return (
              <article
                key={hw.id}
                className={`overflow-hidden rounded-[20px] border bg-[var(--t-card)] transition ${
                  isOpen
                    ? 'border-[#39FF14]/45 shadow-[0_0_28px_rgba(57,255,20,0.12)]'
                    : 'border-[var(--t-edge-2)] hover:border-[#39FF14]/25'
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleExpanded(hw.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpanded(hw.id)
                    }
                  }}
                  className="w-full cursor-pointer px-4 pb-3 pt-4 text-right outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="max-w-[48%] shrink-0 text-start text-[11px] font-medium text-[var(--t-ink-3)] sm:text-xs">
                      {hw.courseName}
                    </div>
                    <div className={`min-w-0 text-end text-xs font-semibold sm:text-sm ${dueClass}`}>
                      <span className="block truncate">
                        {duePrefix}
                        {hw.dueDisplay}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-3 text-lg font-bold leading-snug text-[var(--t-ink)] sm:text-xl">
                    {hw.title}
                  </h2>
                  {hw.descriptionSnippet ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--t-ink-2)]">
                      {hw.descriptionSnippet}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold sm:text-xs ${tag.className}`}
                    >
                      {tag.label}
                    </span>

                    <div className="pointer-events-none flex items-center gap-2">
                      {hw.status === 'assigned' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 px-3 py-1.5 text-xs font-bold text-[#bdfcbd] shadow-[0_0_16px_rgba(57,255,20,0.15)]">
                          مشاهده و ارسال
                          <span aria-hidden className="text-[10px] opacity-80">
                            ‹
                          </span>
                        </span>
                      ) : null}
                      {hw.status === 'submitted' ? (
                        <span className="text-xs font-medium text-[var(--t-ink-3)]">
                          در انتظار بازخورد معلم
                        </span>
                      ) : null}
                      {hw.status === 'graded' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300">
                          مشاهدهٔ بازخورد
                          <span aria-hidden className="text-[10px] opacity-80">
                            ‹
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {isOpen ? (
                  <div className="border-t border-[var(--t-edge)] bg-[var(--t-panel)] px-4 py-4">
                    <h3 className="text-sm font-bold text-[var(--t-ink)]">دستورکار</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--t-ink-2)]">
                      {hw.descriptionFull}
                    </p>

                    {hw.attachments.length ? (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-[var(--t-ink-3)]">ضمیمه‌های معلم</div>
                        <ul className="mt-2 space-y-2">
                          {hw.attachments.map((a) => (
                            <li key={a.id}>
                              <a
                                href={a.href}
                                className="flex items-center gap-2 rounded-xl border border-[var(--t-edge-2)] bg-black/30 px-3 py-2 text-sm font-medium text-[var(--t-brand)] hover:border-[#39FF14]/35"
                                onClick={(e) => e.preventDefault()}
                              >
                                <IconPaperclip className="size-4 shrink-0 opacity-80" />
                                <span className="truncate">{a.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {hw.status !== 'graded' ? (
                      <div className="mt-5 rounded-2xl border border-[var(--t-edge-2)] bg-black/25 p-4">
                        <div className="text-xs font-bold text-[var(--t-ink)]">کار شما</div>
                        <p className="mt-1 text-[11px] text-[var(--t-ink-4)]">
                          فایل خود را اضافه کنید و سپس ثبت نهایی را بزنید (فقط دمو — بدون سرور).
                        </p>
                        <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#39FF14]/35 bg-[#39FF14]/05 px-4 py-3 text-sm font-semibold text-[#bdfcbd] transition hover:bg-[#39FF14]/10">
                          افزودن فایل
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(e) => onPickFile(hw.id, e.target.files?.[0]?.name)}
                          />
                        </label>
                        {pickedFiles[hw.id] ? (
                          <div className="mt-2 truncate text-xs text-[var(--t-ink-2)]">
                            انتخاب‌شده: {pickedFiles[hw.id]}
                          </div>
                        ) : null}
                        {hw.status === 'assigned' ? (
                          <button
                            type="button"
                            onClick={() => turnIn(hw.id)}
                            className="mt-4 w-full rounded-xl bg-[var(--t-brand-2)] py-3 text-sm font-bold text-black shadow-[0_0_24px_var(--t-brand-glow)] transition hover:brightness-110 active:scale-[0.99]"
                          >
                            ثبت نهایی (Turn In)
                          </button>
                        ) : (
                          <p className="mt-4 text-xs font-medium text-[var(--t-ink-3)]">
                            پس از تحویل، امکان ویرایش در این دمو غیرفعال است.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {hw.status === 'graded' ? (
                      <div className="mt-5 rounded-2xl border border-emerald-500/35 bg-emerald-500/08 p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
                        <div className="text-xs font-bold text-emerald-300">بازخورد معلم</div>
                        <div className="mt-2 text-sm font-bold text-[var(--t-ink)]">
                          نمره: {toFaDigits('۱۸/۲۰')}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--t-ink-2)]">
                          عالی بود! فقط در سوال ۳ به جای استفاده از الگوریتم BFS، بهتر بود از DFS استفاده
                          می‌کردی تا مسیر بهینه‌تری پیدا کنی. موفق باشی.
                        </p>
                        <a
                          href="#"
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
                          onClick={(e) => e.preventDefault()}
                        >
                          <IconPaperclip className="size-4" />
                          حل تمرین با اصلاحات.pdf
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
