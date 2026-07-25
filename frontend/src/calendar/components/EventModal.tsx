import { useEffect, useId, useRef, useState } from 'react'
import { IconClock } from './icons'
import type { JalaliDate } from '../lib/jalaliUtils'
import { EVENT_COLORS, peekNextColor } from '../lib/eventColors'
import { formatMonthYear } from '../lib/labels'
import { toFaDigits } from '../lib/persianDigits'
import {
  minutesToLabel,
  parseTimeToMinutes,
  type CalendarEventRecord,
  type EventEditScope,
  type EventRepeatScope,
} from '../types/calendar'

export type ModalMode = 'create' | 'edit'

export interface EventModalInitial {
  date: JalaliDate
  startMinutes: number
  endMinutes: number
  allDay: boolean
}

type SavePayload = {
  date: JalaliDate
  title: string
  description: string
  allDay: boolean
  startMinutes: number
  endMinutes: number
  color: string
  repeat: EventRepeatScope
}

type Props = {
  open: boolean
  mode: ModalMode
  initial: EventModalInitial
  existing?: CalendarEventRecord
  /** تعداد اعضای گروه — بیش از ۱ یعنی رویداد تکراری */
  groupSize?: number
  onClose: () => void
  onSave: (payload: SavePayload, scope: EventEditScope) => void
  onDelete?: (scope: EventEditScope) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINS = [0, 15, 30, 45]

export function EventModal({
  open,
  mode,
  initial,
  existing,
  groupSize = 1,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const colorPopoverRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [allDay, setAllDay] = useState(initial.allDay)
  const [sh, setSh] = useState(9)
  const [sm, setSm] = useState(0)
  const [eh, setEh] = useState(10)
  const [em, setEm] = useState(0)
  const [picked, setPicked] = useState(() => peekNextColor())
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [repeatScope, setRepeatScope] = useState<EventRepeatScope>('none')
  const [editScope, setEditScope] = useState<EventEditScope>('single')
  const titleId = useId()

  const hasGroup = mode === 'edit' && groupSize > 1

  const repeatOptions: { key: EventRepeatScope; label: string; hint?: string }[] = [
    { key: 'none', label: 'همین روز', hint: 'فقط تاریخ انتخاب‌شده' },
    { key: 'full_week', label: 'کل هفته', hint: 'هفت روز این هفتۀ شمسی' },
    { key: 'all_weeks', label: 'کل هفته‌ها', hint: 'همین روز هفته، ۵۲ هفته آینده' },
    { key: 'odd_days', label: 'روزهای فرد', hint: 'فقط با روز فرد تقویمی' },
    { key: 'even_days', label: 'روزهای زوج', hint: 'فقط با روز زوج تقویمی' },
  ]

  useEffect(() => {
    if (!open) return
    const base = existing ?? null
    setTitle(base?.title ?? '')
    setDescription(base?.description ?? '')
    setAllDay(base?.allDay ?? initial.allDay)
    setPicked(base?.color ?? peekNextColor())
    setNotesOpen(!!base?.description)
    setColorMenuOpen(false)
    setRepeatScope('none')
    setEditScope('single')
    const smin = base?.startMinutes ?? initial.startMinutes
    const emin = base?.endMinutes ?? initial.endMinutes
    setSh(Math.floor(smin / 60) % 24)
    setSm(smin % 60)
    setEh(Math.floor(emin / 60) % 24)
    setEm(emin % 60)
  }, [open, initial, existing])

  useEffect(() => {
    if (!colorMenuOpen) return
    const close = (e: Event) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setColorMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [colorMenuOpen])

  if (!open) return null

  const locked = existing?.kind === 'immutable'

  const date = existing
    ? { jy: existing.jy, jm: existing.jm, jd: existing.jd }
    : initial.date

  const startM = parseTimeToMinutes(sh, sm)
  let endM = parseTimeToMinutes(eh, em)
  if (!allDay && endM <= startM) endM = Math.min(1440, startM + 60)

  const dateLabel = `${formatMonthYear(date.jy, date.jm)}، ${toFaDigits(date.jd)}`

  const TimeSelectors = ({
    h,
    m,
    setH,
    setM,
  }: {
    h: number
    m: number
    setH: (n: number) => void
    setM: (n: number) => void
  }) => (
    <div dir="ltr" className="mt-2 flex gap-2">
      <select
        value={h}
        onChange={(e) => setH(Number(e.target.value))}
        className="min-h-[40px] flex-1 rounded-md border border-[var(--t-edge-2)] bg-[var(--t-panel)] text-[var(--t-ink)] px-1 text-sm"
        aria-label="ساعت"
      >
        {HOURS.map((x) => (
          <option key={x} value={x} className="bg-[var(--t-card)] text-[var(--t-ink)]">
            {toFaDigits(String(x).padStart(2, '0'))}
          </option>
        ))}
      </select>
      <select
        value={m}
        onChange={(e) => setM(Number(e.target.value))}
        className="min-h-[40px] flex-1 rounded-md border border-[var(--t-edge-2)] bg-[var(--t-panel)] text-[var(--t-ink)] px-1 text-sm"
        aria-label="دقیقه"
      >
        {MINS.map((x) => (
          <option key={x} value={x} className="bg-[var(--t-card)] text-[var(--t-ink)]">
            {toFaDigits(String(x).padStart(2, '0'))}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-x-hidden rounded-t-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] shadow-[0_-8px_40px_var(--t-brand-glow)] sm:rounded-2xl"
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

        <div className="border-b border-[var(--t-edge)] px-3 py-3">
          <div className="text-sm font-bold text-[var(--t-ink)]">
            {locked ? 'رویداد ثابت (فقط مشاهده)' : 'رویداد'}
          </div>
          {locked ? (
            <p className="mt-1 text-[11px] text-amber-300/90">
              این رویداد توسط مدرسه قفل شده و قابل جابه‌جایی یا حذف نیست.
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-touch px-3 py-3">
          <div className="relative flex items-start gap-2 border-b border-[var(--t-edge)] pb-3">
            <input
              id={titleId}
              className="min-h-[44px] flex-1 rounded-lg bg-[var(--t-panel)] px-3 py-2 text-base text-[var(--t-ink)] outline-none ring-0 placeholder:text-[var(--t-ink-3)] focus:ring-2 focus:ring-[var(--t-brand-2)] disabled:opacity-70"
              placeholder="عنوان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              dir="rtl"
              disabled={locked}
            />
            <div className="relative shrink-0" ref={colorPopoverRef}>
              <button
                type="button"
                aria-label="رنگ رویداد"
                className="mt-1 h-10 w-10 rounded-full border-2 border-white/20 shadow"
                style={{ background: picked }}
                onClick={() => setColorMenuOpen((v) => !v)}
              />
              {colorMenuOpen ? (
                <div className="absolute end-0 top-[calc(100%+8px)] z-10 grid w-[200px] grid-cols-3 gap-2 rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] p-3 shadow-xl">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`mx-auto h-10 w-10 rounded-full border-2 ${picked === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }}
                      onClick={() => {
                        setPicked(c)
                        setColorMenuOpen(false)
                      }}
                      aria-label={`رنگ ${c}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-[48px] items-center gap-2 border-b border-[var(--t-edge)] py-3" dir="rtl">
            <IconClock className="size-5 shrink-0 text-[var(--t-ink-3)]" aria-hidden />
            <span className="min-w-0 flex-1 text-right text-sm text-[var(--t-ink)]">تمام‌روز</span>
            <label className="relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center" dir="ltr">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              <span className="block h-full w-full rounded-full bg-[var(--t-panel-hover)] transition-colors peer-checked:bg-[var(--t-brand-2)]" />
              <span className="pointer-events-none absolute top-1 start-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 will-change-transform peer-checked:translate-x-[22px]" />
            </label>
          </div>

          {hasGroup ? (
            <div className="border-b border-[var(--t-edge)] py-3" dir="rtl">
              <div className="mb-1.5 text-xs font-semibold text-[var(--t-ink-2)]">
                اعمال تغییرات روی ({toFaDigits(groupSize)} رویداد)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditScope('single')}
                  className={`rounded-lg border px-3 py-2 text-center text-[11px] font-bold transition ${
                    editScope === 'single'
                      ? 'border-[var(--t-brand-2)] bg-[var(--t-brand-2)]/15 text-[var(--t-brand)]'
                      : 'border-[var(--t-edge-2)] bg-[var(--t-panel)] text-[var(--t-ink-2)]'
                  }`}
                >
                  فقط این رویداد
                </button>
                <button
                  type="button"
                  onClick={() => setEditScope('group')}
                  className={`rounded-lg border px-3 py-2 text-center text-[11px] font-bold transition ${
                    editScope === 'group'
                      ? 'border-[var(--t-brand-2)] bg-[var(--t-brand-2)]/15 text-[var(--t-brand)]'
                      : 'border-[var(--t-edge-2)] bg-[var(--t-panel)] text-[var(--t-ink-2)]'
                  }`}
                >
                  کل گروه ({toFaDigits(groupSize)})
                </button>
              </div>
              {editScope === 'group' ? (
                <p className="mt-2 text-[10px] text-[var(--t-ink-3)]">
                  عنوان، زمان و رنگ روی همه اعمال می‌شود؛ تاریخ هر رویداد ثابت می‌ماند.
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === 'create' ? (
            <div className="border-b border-[var(--t-edge)] py-3" dir="rtl">
              <div className="mb-1.5 text-xs font-semibold text-[var(--t-ink-2)]">تکرار رویداد</div>
              <div className="grid grid-cols-3 gap-1">
                {repeatOptions.map((opt) => {
                  const active = repeatScope === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRepeatScope(opt.key)}
                      title={opt.hint}
                      className={`rounded-lg border px-2 py-1.5 text-center transition ${
                        active
                          ? 'border-[var(--t-brand-2)] bg-[var(--t-brand-2)]/15 text-[var(--t-brand)]'
                          : 'border-[var(--t-edge-2)] bg-[var(--t-panel)] text-[var(--t-ink-2)] hover:border-white/20'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">{opt.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {!allDay && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[var(--t-edge)] py-3">
              <div className="rounded-lg bg-[var(--t-panel)] p-2 text-right">
                <div className="text-xs text-[var(--t-ink-3)]">شروع</div>
                <div className="text-sm font-medium text-[var(--t-ink)]">{dateLabel}</div>
                <TimeSelectors h={sh} m={sm} setH={setSh} setM={setSm} />
                <div className="mt-1 text-xs text-[var(--t-brand)]">{minutesToLabel(startM)}</div>
              </div>
              <span className="text-[var(--t-ink-3)]" aria-hidden>
                ←
              </span>
              <div className="rounded-lg bg-[var(--t-panel)] p-2 text-right">
                <div className="text-xs text-[var(--t-ink-3)]">پایان</div>
                <div className="text-sm font-medium text-[var(--t-ink)]">{dateLabel}</div>
                <TimeSelectors h={eh} m={em} setH={setEh} setM={setEm} />
                <div className="mt-1 text-xs text-[var(--t-brand)]">{minutesToLabel(endM)}</div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-[var(--t-edge-2)] px-3 py-2 text-right text-sm text-[var(--t-ink-2)]"
            onClick={() => setNotesOpen((v) => !v)}
          >
            یادداشت {notesOpen ? '▼' : '◀'}
          </button>
          {notesOpen ? (
            <textarea
              className="mt-2 min-h-[88px] w-full resize-y rounded-lg bg-[var(--t-panel)] px-3 py-2 text-sm text-[var(--t-ink)] placeholder:text-[var(--t-ink-4)] outline-none focus:ring-2 focus:ring-[var(--t-brand-2)]"
              placeholder="توضیحات"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              dir="rtl"
            />
          ) : null}
        </div>

        <div
          className="flex shrink-0 flex-col gap-2 border-t border-[var(--t-edge)] px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
        >
          {mode === 'edit' && onDelete && !locked ? (
            <button
              type="button"
              className="min-h-[40px] w-full rounded-xl border border-red-800/50 bg-red-900/20 text-sm font-semibold text-red-400"
              onClick={() => {
                const scope = hasGroup ? editScope : 'single'
                const msg =
                  scope === 'group'
                    ? `آیا از حذف همه ${groupSize} رویداد این گروه مطمئن هستید؟`
                    : 'آیا از حذف این رویداد مطمئن هستید؟'
                if (confirm(msg)) onDelete(scope)
              }}
            >
              {hasGroup && editScope === 'group'
                ? `حذف کل گروه (${toFaDigits(groupSize)})`
                : 'حذف رویداد'}
            </button>
          ) : null}

          <div className="flex flex-row-reverse justify-between gap-3">
            {!locked ? (
              <button
                type="button"
                className="min-h-[44px] flex-1 rounded-xl bg-[var(--t-brand-2)] text-sm font-semibold text-black"
                onClick={() => {
                  onSave(
                    {
                      date,
                      title,
                      description,
                      allDay,
                      startMinutes: allDay ? 0 : startM,
                      endMinutes: allDay ? 1440 : endM,
                      color: picked,
                      repeat: mode === 'create' ? repeatScope : 'none',
                    },
                    mode === 'edit' ? editScope : 'single',
                  )
                }}
              >
                {mode === 'create' ? 'ذخیره' : 'به‌روزرسانی'}
              </button>
            ) : null}
            <button
              type="button"
              className="min-h-[44px] flex-1 rounded-xl text-sm font-semibold text-[var(--t-ink-2)]"
              onClick={onClose}
            >
              {locked ? 'بستن' : 'انصراف'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
