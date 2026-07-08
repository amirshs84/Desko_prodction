import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconPaperclip } from '../components/icons'
import {
  DEFAULT_SUBJECT,
  HOMEWORK_DATA,
  SUBJECT_CONFIGS,
  daysUntilDue,
  priorityMeta,
  statusMeta,
  urgencyBorderClass,
  type Priority,
} from '../lib/homeworkData'
import { calPathHomework } from '../lib/paths'
import { toFaDigits } from '../lib/persianDigits'

export function HomeworkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hw = HOMEWORK_DATA.find((h) => h.id === id)

  const [status, setStatus] = useState(hw?.status ?? 'assigned')
  const [pickedFile, setPickedFile] = useState<string | undefined>()

  if (!hw) {
    return (
      <div
        dir="rtl"
        className="flex h-full items-center justify-center bg-black text-[var(--t-ink-3)]"
      >
        <div className="text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 text-sm">تکلیف پیدا نشد</p>
          <Link
            to={calPathHomework()}
            className="mt-4 inline-block text-xs text-[#39FF14] underline"
          >
            بازگشت به تکالیف
          </Link>
        </div>
      </div>
    )
  }

  const days = daysUntilDue(hw.dueAt)
  const border = urgencyBorderClass(days, hw.priority)
  const subj = SUBJECT_CONFIGS[hw.subjectKey] ?? DEFAULT_SUBJECT
  const pm = priorityMeta(hw.priority as Priority)
  const sm = statusMeta(status)

  const dueDateLabel = () => {
    if (days < 0) return `${toFaDigits(Math.abs(Math.round(days)))} روز تأخیر`
    if (days === 0) return 'امروز'
    if (days === 1) return 'فردا'
    return `${toFaDigits(Math.round(days))} روز دیگر`
  }

  const handleTurnIn = () => {
    setStatus('submitted')
  }

  return (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white"
    >
      <header
        className="sticky top-0 z-40 border-b border-[var(--t-edge)] bg-black/90 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="بازگشت"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)] transition hover:border-[#39FF14]/45"
          >
            <IconArrowLeft className="size-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-[var(--t-ink-4)]">
              {hw.courseName}
            </p>
            <h1 className="truncate text-base font-bold text-white">
              {hw.title}
            </h1>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${sm.cls}`}
          >
            {sm.label}
          </span>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto scroll-touch"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
          <div
            className={`rounded-2xl border bg-[var(--t-card)] px-5 py-5 ${border}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-3xl font-bold ${subj.bg} ${subj.border} ${subj.color}`}
              >
                {subj.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold leading-snug text-white">
                  {hw.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--t-ink-3)]">
                  {hw.description}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--t-edge)] pt-4">
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--t-edge-2)] bg-black/30 px-3 py-1.5">
                <span className="text-sm">📅</span>
                <span className="text-xs font-semibold text-[var(--t-ink-2)]">
                  {dueDateLabel()}
                  {hw.dueTimeDisplay
                    ? ` — ساعت ${toFaDigits(hw.dueTimeDisplay)}`
                    : ''}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold ${pm.cls}`}
              >
                اهمیت: {pm.label}
                {hw.priority === 'high' ? (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                ) : null}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] px-5 py-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--t-ink-3)]">
              دستورکار
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--t-ink-2)]">
              {hw.descriptionFull}
            </p>
          </div>

          {hw.attachments.length > 0 ? (
            <div className="rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] px-5 py-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--t-ink-3)]">
                ضمیمه‌های معلم
              </h3>
              <ul className="flex flex-col gap-2">
                {hw.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="flex items-center gap-2.5 rounded-xl border border-[var(--t-edge-2)] bg-black/30 px-3 py-2.5 text-sm font-medium text-[#34d399] transition hover:border-[#39FF14]/35"
                    >
                      <IconPaperclip className="size-4 shrink-0 opacity-80" />
                      <span className="truncate">{a.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status !== 'graded' ? (
            <div className="rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] px-5 py-4">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--t-ink-3)]">
                کار شما
              </h3>
              <p className="mb-4 text-[11px] text-[var(--t-ink-4)]">
                فایل خود را اضافه کنید و سپس ثبت نهایی را بزنید (دمو — بدون
                سرور).
              </p>

              {status === 'assigned' ? (
                <>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#39FF14]/40 bg-[#39FF14]/06 px-4 py-3 text-sm font-semibold text-[#bdfcbd] transition hover:bg-[#39FF14]/12">
                    📎 افزودن فایل
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) =>
                        setPickedFile(e.target.files?.[0]?.name)
                      }
                    />
                  </label>
                  {pickedFile ? (
                    <p className="mt-2 truncate text-xs text-[var(--t-ink-2)]">
                      انتخاب‌شده: {pickedFile}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleTurnIn}
                    className="mt-4 w-full rounded-xl bg-[var(--t-brand-2)] py-3.5 text-sm font-extrabold text-black shadow-[0_0_28px_var(--t-brand-glow)] transition hover:brightness-110 active:scale-[0.99]"
                  >
                    ثبت نهایی
                  </button>
                </>
              ) : null}

              {status === 'submitted' ? (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--t-edge-2)] bg-black/20 px-4 py-3">
                  <span className="text-lg">⏳</span>
                  <p className="text-sm text-[var(--t-ink-3)]">
                    تکلیف تحویل داده شد. در انتظار بازخورد معلم هستیم.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {hw.status === 'graded' ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/07 px-5 py-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  بازخورد معلم
                </h3>
                {hw.grade ? (
                  <span className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-base font-extrabold text-emerald-300">
                    نمره: {hw.grade}
                  </span>
                ) : null}
              </div>
              {hw.feedback ? (
                <p className="text-sm leading-7 text-[var(--t-ink-2)]">
                  {hw.feedback}
                </p>
              ) : null}
            </div>
          ) : null}

          <Link
            to={calPathHomework()}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[var(--t-edge-2)] bg-[var(--t-card)] py-3 text-sm font-semibold text-[var(--t-ink-2)] transition hover:border-white/20"
          >
            <IconArrowLeft className="size-4 rotate-180" />
            بازگشت به لیست تکالیف
          </Link>
        </div>
      </main>
    </div>
  )
}
