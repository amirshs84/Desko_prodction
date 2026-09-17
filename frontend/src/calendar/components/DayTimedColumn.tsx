import { useRef, useState } from 'react'
import { IconPlus } from './icons'
import { GRID_PX, HOUR_PX, yToMinute, pixelsForRange } from './timeGrid'
import { layoutTimedEvents } from '../lib/layoutEvents'
import type { JalaliDate } from '../lib/jalaliUtils'
import {
  EVENT_DRAG_MIME,
  isTemplateDrag,
  parseTemplateDrag,
  type DragBlockTemplate,
} from '../lib/dragMime'
import type { CalendarEventRecord } from '../types/calendar'
import { minutesToLabel } from '../types/calendar'
import { useEvents } from '../context/EventsContext'
import {
  eventBlockStyle,
  INACTIVE_HATCH,
  isProposedEvent,
} from '../lib/eventAppearance'

/** جلوگیری از انتخاب اسلات هنگام اسکرول لمسی؛ فقط ضربه مستقیم */
const TAP_MOVE_THRESH_SQ = 10 * 10

type WeekSlotProps = {
  selectedHour: number | null
  showHighlight: boolean
  onBackgroundPointer: (e: React.PointerEvent<HTMLDivElement>) => void
}

type Props = {
  events: CalendarEventRecord[]
  onEdit: (e: CalendarEventRecord) => void
  /** تاریخ این ستون — برای درگ‌اند‌دراپ بین روزها */
  date?: JalaliDate
  /** رها کردن رویداد موجود روی این ستون */
  onDropEvent?: (
    eventId: string,
    target: { date: JalaliDate; startMinutes: number },
  ) => void | Promise<void>
  /** رها کردن بلوک آماده از پنل */
  onDropTemplate?: (
    template: DragBlockTemplate,
    target: { date: JalaliDate; startMinutes: number },
  ) => void | Promise<void>
  /** نمای هفته: انتخاب دو مرحله‌ای روی هر ساعت */
  weekSlot?: WeekSlotProps
  /** نمای روز: یک ضربه برای ساخت */
  onSimpleCreate?: (minute: number) => void
  /** اولین رویداد سمت راست (نمای روز) */
  rtlLanes?: boolean
}

export function DayTimedColumn({
  events,
  onEdit,
  date,
  onDropEvent,
  onDropTemplate,
  weekSlot,
  onSimpleCreate,
  rtlLanes = false,
}: Props) {
  const timed = events.filter((e) => !e.allDay)
  const laid = layoutTimedEvents(timed, { rtlLanes })
  const tapRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const columnRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const { awakeStartMinutes, awakeEndMinutes, isOutsideAwake, respondProposed, isOwnCalendar } =
    useEvents()

  const canDrop = !!(date && (onDropEvent || onDropTemplate))

  const showInactiveHint = () => {
    setHint('این بازه خارج از ساعت بیداری است؛ اینجا نمی‌شود چیزی گذاشت.')
    window.setTimeout(() => setHint(null), 2200)
  }

  const runBackgroundTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-cal-event="1"]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const minute = yToMinute(e.clientY - rect.top, GRID_PX)
    if (isOutsideAwake(minute)) {
      showInactiveHint()
      return
    }
    if (weekSlot) {
      weekSlot.onBackgroundPointer(e)
      return
    }
    if (onSimpleCreate) {
      onSimpleCreate(minute)
    }
  }

  const onBgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-cal-event="1"]')) return
    tapRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
  }

  const onBgPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = tapRef.current
    tapRef.current = null
    if (!t || t.pointerId !== e.pointerId) return
    if ((e.target as HTMLElement).closest('[data-cal-event="1"]')) return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (dx * dx + dy * dy > TAP_MOVE_THRESH_SQ) return
    runBackgroundTap(e)
  }

  const onBgPointerCancel = () => {
    tapRef.current = null
  }

  const resolveDropMinutes = (clientY: number) => {
    const el = columnRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return yToMinute(clientY - rect.top, GRID_PX)
  }

  const allowDrop = (e: React.DragEvent) => {
    if (!canDrop) return
    e.preventDefault()
    e.stopPropagation()
    const types = Array.from(e.dataTransfer.types)
    // باید با effectAllowed مبدأ یکی باشد؛ وگرنه علامت 🚫 می‌آید
    e.dataTransfer.dropEffect = isTemplateDrag(types) ? 'copy' : 'move'
    setDragOver(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!canDrop || !date) return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const target = {
      date,
      startMinutes: resolveDropMinutes(e.clientY),
    }
    if (isOutsideAwake(target.startMinutes)) {
      showInactiveHint()
      return
    }
    const template = parseTemplateDrag(e.dataTransfer)
    if (template && onDropTemplate) {
      void onDropTemplate(template, target)
      return
    }
    const eventId =
      e.dataTransfer.getData(EVENT_DRAG_MIME) ||
      e.dataTransfer.getData('text/plain')
    if (eventId && !eventId.startsWith('desko-tpl:') && onDropEvent) {
      void onDropEvent(eventId, target)
    }
  }

  return (
    <div
      ref={columnRef}
      className={`relative min-w-0 flex-1 overflow-hidden border-s border-[var(--t-edge)] ${
        dragOver ? 'bg-[rgba(14,165,233,0.12)] ring-2 ring-inset ring-sky-400/40' : ''
      }`}
      style={{ height: GRID_PX, touchAction: 'pan-y' }}
      onDragEnter={canDrop ? allowDrop : undefined}
      onDragOver={canDrop ? allowDrop : undefined}
      onDragLeave={
        canDrop
          ? (e) => {
              if (!columnRef.current?.contains(e.relatedTarget as Node)) {
                setDragOver(false)
              }
            }
          : undefined
      }
      onDrop={canDrop ? handleDrop : undefined}
    >
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className="pointer-events-none absolute start-0 end-0 border-b border-[var(--t-edge)]"
          style={{ top: h * HOUR_PX, height: HOUR_PX }}
        >
          <div className="absolute start-0 end-0 top-1/4 border-b border-dotted border-white/10" />
          <div className="absolute start-0 end-0 top-1/2 border-b border-dotted border-white/10" />
          <div className="absolute start-0 end-0 top-3/4 border-b border-dotted border-white/10" />
        </div>
      ))}

      {awakeStartMinutes > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-[4] overflow-hidden"
          style={{
            top: 0,
            height: pixelsForRange(0, awakeStartMinutes).height,
            backgroundImage: INACTIVE_HATCH,
          }}
        >
          <div className="flex h-full min-h-[48px] items-center justify-center">
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              خارج از بازه فعال
            </span>
          </div>
        </div>
      ) : null}
      {awakeEndMinutes < 1440 ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-[4] overflow-hidden"
          style={{
            top: pixelsForRange(awakeEndMinutes, 1440).top,
            height: pixelsForRange(awakeEndMinutes, 1440).height,
            backgroundImage: INACTIVE_HATCH,
          }}
        >
          <div className="flex h-full items-start justify-center pt-3">
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              استراحت · چیزی اضافه نمی‌شود
            </span>
          </div>
        </div>
      ) : null}

      <div
        className="absolute inset-0 z-[5]"
        role="presentation"
        onPointerDown={onBgPointerDown}
        onPointerUp={onBgPointerUp}
        onPointerCancel={onBgPointerCancel}
        onDragEnter={canDrop ? allowDrop : undefined}
        onDragOver={canDrop ? allowDrop : undefined}
        onDrop={canDrop ? handleDrop : undefined}
      />

      {weekSlot?.showHighlight && weekSlot.selectedHour != null ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-[6] rounded-lg border-2 border-[var(--t-brand-2)] bg-[var(--t-brand-2)]/18"
          style={{ top: weekSlot.selectedHour * HOUR_PX, height: HOUR_PX }}
        >
          <div className="flex h-full items-center justify-center">
            <IconPlus className="size-7 text-[var(--t-brand)]" aria-hidden />
          </div>
        </div>
      ) : null}

      {laid.map((ev) => {
        const { top, height } = pixelsForRange(ev.startMinutes, ev.endMinutes)
        const w = 100 / ev.laneCount
        const laneOffset = (ev.lane / ev.laneCount) * 100
        const locked = ev.kind === 'immutable'
        const proposed = isProposedEvent(ev)
        const draggable = !locked && !proposed && !!onDropEvent
        const look = eventBlockStyle(ev)
        return (
          <button
            key={ev.id}
            type="button"
            data-cal-event="1"
            data-immutable={locked ? '1' : '0'}
            draggable={draggable}
            title={
              locked
                ? 'رویداد ثابت مدرسه — قابل جابه‌جایی نیست'
                : proposed
                  ? 'پیشنهاد مشاور — تأیید یا رد کنید'
                  : 'بکشید و رها کنید تا جابه‌جا شود؛ برای ویرایش کلیک کنید'
            }
            className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-start text-xs leading-tight shadow-md ${
              locked
                ? 'border-slate-500/70 cursor-default'
                : proposed
                  ? 'border-dashed border-white/50 cursor-pointer'
                  : draggable
                    ? 'border-black/30 cursor-grab active:cursor-grabbing'
                    : 'border-black/30 active:scale-[0.99]'
            }`}
            style={{
              top,
              height,
              ...(rtlLanes
                ? { right: `${laneOffset}%` }
                : { left: `${laneOffset}%` }),
              width: `${w}%`,
              ...look,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={
              draggable
                ? (e) => {
                    draggedRef.current = true
                    e.dataTransfer.setData(EVENT_DRAG_MIME, ev.id)
                    e.dataTransfer.setData('text/plain', ev.id)
                    e.dataTransfer.effectAllowed = 'copyMove'
                    if (e.currentTarget instanceof HTMLElement) {
                      e.dataTransfer.setDragImage(e.currentTarget, 12, 12)
                    }
                  }
                : undefined
            }
            onDragOver={canDrop ? allowDrop : undefined}
            onDrop={canDrop ? handleDrop : undefined}
            onDragEnd={() => {
              window.setTimeout(() => {
                draggedRef.current = false
              }, 0)
              setDragOver(false)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (draggedRef.current) return
              onEdit(ev)
            }}
          >
            <div className="truncate font-bold">
              {locked ? '🔒 ' : proposed ? '✦ ' : ''}
              {ev.title}
            </div>
            <div className="truncate text-[10px] opacity-75">{minutesToLabel(ev.startMinutes)}</div>
            {proposed && isOwnCalendar ? (
              <div className="mt-1 flex gap-1" dir="rtl">
                <span
                  role="presentation"
                  className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-black"
                  onClick={(e) => {
                    e.stopPropagation()
                    void respondProposed(ev.id, true)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  تأیید
                </span>
                <span
                  role="presentation"
                  className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-black text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    const reason = window.prompt('چرا این بلوک را رد می‌کنی؟ (برای مشاور)')
                    if (reason === null) return
                    void respondProposed(ev.id, false, reason)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  رد
                </span>
              </div>
            ) : null}
          </button>
        )
      })}

      {hint ? (
        <div className="pointer-events-none absolute inset-x-2 top-3 z-20 rounded-xl bg-slate-900/90 px-3 py-2 text-center text-[11px] font-semibold text-slate-100 shadow-lg">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

const GUTTER_CLASS = 'relative z-20 w-10 shrink-0 select-none text-[10px] text-[var(--t-ink-3)] sm:w-11 sm:text-xs'

export function HourGutter() {
  return (
    <div className={GUTTER_CLASS} style={{ height: GRID_PX }}>
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className="absolute flex w-full items-start justify-center pt-0.5"
          style={{ top: h * HOUR_PX, height: HOUR_PX }}
        >
          {String(h).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}
        </div>
      ))}
      <div
        className="absolute flex w-full items-start justify-center pt-0.5"
        style={{ top: GRID_PX - 8, height: 8 }}
      >
        ۰
      </div>
    </div>
  )
}
