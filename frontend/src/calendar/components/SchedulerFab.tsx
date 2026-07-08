import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconAiSparkle } from './icons'

export type SchedulerAction = 'complete' | 'weakness' | 'advisor'

type Props = {
  disabled?: boolean
  onAction: (action: SchedulerAction) => void
}

type MenuItem = {
  key: SchedulerAction
  label: string
  hint: string
  accent: string
  icon: ReactNode
}

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'complete',
    label: 'تکمیل برنامه هفتگی',
    hint: 'پر کردن شنبه تا پنج‌شنبه با ترکیب درس‌ها',
    accent: 'from-violet-500/25 to-violet-600/5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        <path d="M8 14h2M14 14h2M8 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'weakness',
    label: 'اصلاح بر اساس نقاط ضعف',
    hint: 'جابه‌جایی جزئی و جلسات تقویتی',
    accent: 'from-fuchsia-500/20 to-purple-600/5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
        <path d="M4 18v-4M8 18V8M12 18v-6M16 18v-9M20 18V5" strokeLinecap="round" />
        <path d="M3 18h18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'advisor',
    label: 'درخواست از مشاور',
    hint: 'ارسال درخواست برای بررسی مشاور',
    accent: 'from-indigo-500/20 to-violet-600/5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
        <path d="M21 14.5a4.5 4.5 0 0 0-4.5-4.5H7.5A4.5 4.5 0 0 0 3 14.5V16h18v-1.5Z" />
        <path d="M7.5 10a4.5 4.5 0 1 1 9 0" strokeLinecap="round" />
        <path d="M12 14v3M9.5 20h5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function SchedulerFab({ disabled, onAction }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  const pick = (action: SchedulerAction) => {
    setOpen(false)
    onAction(action)
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label="برنامه‌ریزی خودکار"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`grid h-14 w-14 place-items-center rounded-full border-2 border-violet-400/40 bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#a855f7] text-white shadow-[0_0_28px_rgba(168,85,247,0.55)] transition hover:scale-[1.03] active:scale-95 disabled:opacity-50 ${open ? 'ring-2 ring-violet-300/60 ring-offset-2 ring-offset-black' : ''}`}
      >
        <IconAiSparkle className="size-7" />
      </button>

      {open ? (
        <div
          className="absolute bottom-[calc(100%+12px)] z-50 w-[min(300px,calc(100vw-32px))] ltr:left-0 ltr:right-auto rtl:left-auto rtl:right-0"
          dir="rtl"
        >
          <div className="overflow-hidden rounded-3xl border border-violet-500/25 bg-[var(--t-card)]/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(168,85,247,0.12)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-violet-500/10 px-3 py-2">
              <span className="grid size-8 place-items-center rounded-xl bg-violet-500/20 text-violet-200">
                <IconAiSparkle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[var(--t-ink)]">برنامه‌ریزی هوشمند</div>
                <div className="text-[11px] text-[var(--t-ink-3)]">یکی از گزینه‌ها را انتخاب کن</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {MENU_ITEMS.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  style={{ animationDelay: `${index * 55}ms` }}
                  className={`group scheduler-menu-item flex w-full items-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-l ${item.accent} px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-violet-300/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_22px_rgba(109,40,217,0.28)] active:translate-y-0 active:scale-[0.985]`}
                  onClick={() => pick(item.key)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-300/25 bg-violet-500/15 text-violet-100 transition group-hover:border-violet-200/40 group-hover:bg-violet-500/25">
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-[var(--t-ink)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--t-ink-3)] group-hover:text-[var(--t-ink-2)]">
                      {item.hint}
                    </span>
                  </span>

                  <span
                    aria-hidden
                    className="shrink-0 text-violet-300/70 transition group-hover:translate-x-[-2px] group-hover:text-violet-200"
                  >
                    ‹
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes schedulerMenuIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .scheduler-menu-item {
          animation: schedulerMenuIn 280ms ease-out both;
        }
      `}</style>
    </div>
  )
}
