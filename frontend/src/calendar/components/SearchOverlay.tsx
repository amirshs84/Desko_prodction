import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconSearch, IconVideo, IconX } from './icons'
import { useEvents } from '../context/EventsContext'
import { useSelectedDay } from '../context/SelectedDayContext'
import { jalaaliToDate, type JalaliDate } from '../lib/jalaliUtils'
import { formatMonthYear, WEEKDAY_FULL } from '../lib/labels'
import { jalaliWeekDay } from '../lib/jalaliUtils'
import { toFaDigits } from '../lib/persianDigits'
import type { CalendarEventRecord } from '../types/calendar'
import { minutesToLabel } from '../types/calendar'
import { calPathDay } from '../lib/paths'

function keyOf(d: JalaliDate): string {
  return `${d.jy}-${d.jm}-${d.jd}`
}

function highlightTitle(text: string, q: string): ReactNode {
  const trimmed = q.trim()
  if (!trimmed) return text
  const lower = text.toLocaleLowerCase('fa')
  const iq = trimmed.toLocaleLowerCase('fa')
  const idx = lower.indexOf(iq)
  if (idx < 0) return text
  const before = text.slice(0, idx)
  const mid = text.slice(idx, idx + trimmed.length)
  const after = text.slice(idx + trimmed.length)
  return (
    <>
      {before}
      <span className="text-[var(--t-brand)]">{mid}</span>
      {after}
    </>
  )
}

type Props = {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const { events } = useEvents()
  const { setSelected } = useSelectedDay()
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const grouped = useMemo(() => {
    const qq = q.trim().toLocaleLowerCase('fa')
    const filtered = qq
      ? events.filter(
          (e) =>
            e.title.toLocaleLowerCase('fa').includes(qq) ||
            e.description.toLocaleLowerCase('fa').includes(qq),
        )
      : []

    const map = new Map<string, CalendarEventRecord[]>()
    for (const e of filtered) {
      const k = `${e.jy}-${e.jm}-${e.jd}`
      const arr = map.get(k) ?? []
      arr.push(e)
      map.set(k, arr)
    }
    const keys = [...map.keys()].sort((a, b) => {
      const [ay, am, ad] = a.split('-').map(Number)
      const [by, bm, bd] = b.split('-').map(Number)
      if (ay !== by) return ay - by
      if (am !== bm) return am - bm
      return ad - bd
    })
    return keys.map((k) => {
      const [jy, jm, jd] = k.split('-').map(Number)
      return {
        date: { jy, jm, jd } as JalaliDate,
        items: (map.get(k) ?? []).sort((x, y) => x.startMinutes - y.startMinutes),
      }
    })
  }, [events, q])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" dir="rtl">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--t-edge)] bg-black px-2 py-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}>
        <button
          type="button"
          aria-label="بازگشت"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--t-edge-2)] text-[var(--t-ink)]"
          onClick={onClose}
        >
          <IconArrowLeft className="size-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--t-edge-2)] bg-[var(--t-panel)] px-2">
          <IconSearch className="size-5 shrink-0 text-[var(--t-ink-3)]" />
          <input
            className="min-h-[44px] flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--t-ink-3)]"
            placeholder="جستجوی رویدادها"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q ? (
            <button
              type="button"
              aria-label="پاک کردن"
              className="grid h-9 w-9 place-items-center text-[var(--t-ink-2)]"
              onClick={() => setQ('')}
            >
              <IconX className="size-5" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-3 py-2">
        {!q.trim() ? (
          <p className="mt-4 text-center text-sm text-[var(--t-ink-3)]">
            عبارتی برای جستجو وارد کنید
          </p>
        ) : grouped.length === 0 ? (
          <p className="mt-4 text-center text-sm text-[var(--t-ink-3)]">نتیجه‌ای نیست</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-[var(--t-ink-3)]">
              برای دیدن رویدادهای قبل، عبارت را دقیق‌تر کنید (نمایشی)
            </p>
            <div className="flex flex-col gap-3">
              {grouped.map(({ date, items }) => {
                const wd = WEEKDAY_FULL[jalaliWeekDay(date.jy, date.jm, date.jd)]
                const g = jalaaliToDate(date.jy, date.jm, date.jd)
                const greg = g.toLocaleDateString('fa-IR')
                return (
                  <div key={keyOf(date)}>
                    <div className="mb-1 text-xs text-[var(--t-ink-3)]">
                      {wd}، {toFaDigits(date.jd)} {formatMonthYear(date.jy, date.jm).split(' ')[0]} — <span className="opacity-70">{greg}</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[var(--t-edge)] bg-[var(--t-card)]">
                      {items.map((e, i) => (
                        <button
                          key={e.id}
                          type="button"
                          className={`flex w-full items-stretch gap-2 px-3 py-2 text-start active:bg-white/5 ${
                            i > 0 ? 'border-t border-[var(--t-edge)]' : ''
                          }`}
                          onClick={() => {
                            setSelected({ jy: e.jy, jm: e.jm, jd: e.jd })
                            nav(calPathDay(e.jy, e.jm, e.jd))
                            onClose()
                          }}
                        >
                          <span className="flex w-12 shrink-0 flex-col items-end justify-center text-xs text-[var(--t-ink)]">
                            {minutesToLabel(e.startMinutes)}
                          </span>
                          <span
                            className="w-1 shrink-0 rounded-full"
                            style={{ background: e.color }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[var(--t-ink)]">
                              {highlightTitle(e.title, q)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--t-ink-3)]">
                              {minutesToLabel(e.startMinutes)} — {minutesToLabel(e.endMinutes)}
                            </div>
                          </span>
                          <span className="grid w-8 shrink-0 place-items-center text-[var(--t-ink-3)]">
                            <IconVideo className="size-4 text-[var(--t-ink-3)]" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
