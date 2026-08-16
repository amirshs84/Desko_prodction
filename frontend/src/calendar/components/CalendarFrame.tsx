import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCalendarSwipe } from '../hooks/useCalendarSwipe'
import { usePeriodNavigation } from '../hooks/usePeriodNavigation'
import { useSelectedDay } from '../context/SelectedDayContext'
import { jalaliWeekDay } from '../lib/jalaliUtils'
import { JALALI_MONTHS, WEEKDAY_FULL } from '../lib/labels'
import { toFaDigits } from '../lib/persianDigits'
import { calPathDay, calPathMonth, calPathWeek, calPathYear } from '../lib/paths'
import { IconArrowLeft, IconArrowRight, IconMenu, IconPlus, IconSearch } from './icons'
import { SearchOverlay } from './SearchOverlay'

type Tab = 'year' | 'month' | 'week' | 'day'

type Props = {
  title: string
  subtitle?: string
  active: Tab
  onFab: () => void
  extraFab?: ReactNode
  children: ReactNode
}

export function CalendarFrame({ title, subtitle, active, onFab, extraFab, children }: Props) {
  const { selected } = useSelectedDay()
  const loc = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { goPrev, goNext, goToday, labels, viewingToday } = usePeriodNavigation(active)
  const swipeEnabled = !menuOpen && !searchOpen
  const { surfaceRef, style: swipeStyle } = useCalendarSwipe({
    enabled: swipeEnabled,
    resetKey: loc.pathname,
    onPrev: goPrev,
    onNext: goNext,
  })

  useEffect(() => {
    setMenuOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [menuOpen])

  const jy = selected.jy
  const jm = selected.jm
  const jd = selected.jd
  const wd = jalaliWeekDay(jy, jm, jd)
  const dayName = WEEKDAY_FULL[wd]
  const monthName = JALALI_MONTHS[jm - 1]
  const bottomLabel = `افزودن رویداد در ${dayName} ${toFaDigits(jd)} ${monthName}`

  const items: { key: Tab; label: string; path: string }[] = [
    { key: 'year', label: 'سال', path: calPathYear(jy) },
    { key: 'month', label: 'ماه', path: calPathMonth(jy, jm) },
    { key: 'week', label: 'هفته', path: calPathWeek(jy, jm, jd) },
    { key: 'day', label: 'روز', path: calPathDay(jy, jm, jd) },
  ]

  const navBtnClass =
    'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)] transition active:scale-95 hover:bg-white/5'

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-[var(--t-ink)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--t-edge)] bg-black/90 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
      >
        <div
          className="flex items-center gap-1.5 py-2"
          style={{
            paddingInlineStart: '12px',
            paddingInlineEnd: '12px',
          }}
        >
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="منو"
              aria-expanded={menuOpen}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <IconMenu className="size-6" />
            </button>
            {menuOpen ? (
              <div
                className="absolute top-[calc(100%+6px)] z-50 min-w-[160px] max-w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] py-1 shadow-xl ltr:left-0 ltr:right-auto rtl:left-auto rtl:right-0"
              >
                {items.map((it) => (
                  <Link
                    key={it.key}
                    to={it.path}
                    className={`flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold ${
                      active === it.key
                        ? 'bg-[var(--t-brand-2)]/20 text-[var(--t-brand)]'
                        : 'text-[var(--t-ink)] hover:bg-white/5'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>{it.label}</span>
                    {active === it.key ? <span aria-hidden>✓</span> : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
            <button
              type="button"
              aria-label={labels.prev}
              title={labels.prev}
              className={navBtnClass}
              onClick={goPrev}
            >
              <IconArrowRight className="size-5" />
            </button>
            <div className="min-w-0 flex-1 px-0.5 text-center">
              <div className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</div>
              {subtitle ? (
                <div className="truncate text-xs text-[var(--t-ink-3)]">{subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={labels.next}
              title={labels.next}
              className={navBtnClass}
              onClick={goNext}
            >
              <IconArrowLeft className="size-5" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="جستجو"
              className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)]"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch className="size-5" />
            </button>
            <button
              type="button"
              aria-label="رفتن به امروز"
              title="امروز"
              onClick={goToday}
              className={`grid h-11 min-w-11 place-items-center rounded-xl border px-2 text-sm font-bold transition ${
                viewingToday
                  ? 'border-[var(--t-brand-2)] bg-[var(--t-brand-2)]/15 text-[var(--t-brand)]'
                  : 'border-[var(--t-edge-2)] text-[var(--t-brand)] hover:bg-white/5'
              }`}
            >
              {toFaDigits(jd)}
            </button>
          </div>
        </div>
      </header>

      <main
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          paddingInlineStart: '12px',
          paddingInlineEnd: '12px',
        }}
      >
        <div
          ref={surfaceRef}
          className="cal-swipe h-full min-h-0 overflow-x-hidden"
          style={swipeStyle}
        >
          {children}
        </div>
      </main>

      <div
        className="sticky bottom-0 z-30 border-t border-[var(--t-edge)] bg-black/95 py-2 backdrop-blur-md"
        style={{
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
          paddingInlineStart: '12px',
          paddingInlineEnd: '12px',
        }}
      >
        <div className="flex items-center gap-2" dir="rtl">
          {extraFab}
          <button
            type="button"
            aria-label="افزودن رویداد"
            onClick={onFab}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--t-brand-2)] text-black shadow-[0_0_24px_var(--t-brand-glow)]"
          >
            <IconPlus className="size-7" />
          </button>
          <button
            type="button"
            onClick={onFab}
            className="min-h-[48px] flex-1 truncate rounded-full border border-[var(--t-edge-2)] bg-[var(--t-panel)] px-4 text-right text-sm text-[var(--t-ink-2)]"
          >
            {bottomLabel}
          </button>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
