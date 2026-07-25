import { useRef, useState } from 'react'
import { IconPlus } from './icons'
import { GRID_PX, HOUR_PX, yToMinute, pixelsForRange } from './timeGrid'
import { layoutTimedEvents } from '../lib/layoutEvents'
import type { JalaliDate } from '../lib/jalaliUtils'
import {
  EVENT_DRAG_MIME,
  TEMPLATE_DRAG_MIME,
  type DragBlockTemplate,
} from '../lib/dragMime'
import type { CalendarEventRecord } from '../types/calendar'
import { minutesToLabel } from '../types/calendar'

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

  const canDrop = !!(date && (onDropEvent || onDropTemplate))

  const runBackgroundTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-cal-event="1"]')) return
    if (weekSlot) {
      weekSlot.onBackgroundPointer(e)
      return
    }
    if (onSimpleCreate) {
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      onSimpleCreate(yToMinute(y, GRID_PX))
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

  return (
    <div
      ref={columnRef}
      className={`relative min-w-0 flex-1 overflow-hidden border-s border-[var(--t-edge)] ${
        dragOver ? 'bg-[rgba(14,165,233,0.12)]' : ''
      }`}
      style={{ height: GRID_PX, touchAction: 'pan-y' }}
      onDragOver={
        canDrop
          ? (e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOver(true)
            }
          : undefined
      }
      onDragLeave={
        canDrop
          ? (e) => {
              if (!columnRef.current?.contains(e.relatedTarget as Node)) {
                setDragOver(false)
              }
            }
          : undefined
      }
      onDrop={
        canDrop
          ? (e) => {
              e.preventDefault()
              setDragOver(false)
              if (!date) return
              const target = {
                date,
                startMinutes: resolveDropMinutes(e.clientY),
              }
              const templateRaw = e.dataTransfer.getData(TEMPLATE_DRAG_MIME)
              if (templateRaw && onDropTemplate) {
                try {
                  const template = JSON.parse(templateRaw) as DragBlockTemplate
                  void onDropTemplate(template, target)
                } catch {
                  /* ignore bad payload */
                }
                return
              }
              const eventId =
                e.dataTransfer.getData(EVENT_DRAG_MIME) ||
                e.dataTransfer.getData('text/plain')
              if (eventId && onDropEvent) {
                void onDropEvent(eventId, target)
              }
            }
          : undefined
      }
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

      <div
        className="absolute inset-0 z-[5]"
        role="presentation"
        onPointerDown={onBgPointerDown}
        onPointerUp={onBgPointerUp}
        onPointerCancel={onBgPointerCancel}
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
        const draggable = !locked && !!onDropEvent
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
                : 'بکشید و رها کنید تا جابه‌جا شود؛ برای ویرایش کلیک کنید'
            }
            className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-start text-xs leading-tight shadow-md ${
              locked
                ? 'border-amber-700/50 cursor-default'
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
              background: ev.color,
              color: '#081016',
              opacity: locked ? 0.92 : 1,
              backgroundImage: locked
                ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 8px)'
                : undefined,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={
              draggable
                ? (e) => {
                    draggedRef.current = true
                    e.dataTransfer.setData(EVENT_DRAG_MIME, ev.id)
                    e.dataTransfer.setData('text/plain', ev.id)
                    e.dataTransfer.effectAllowed = 'move'
                    if (e.currentTarget instanceof HTMLElement) {
                      e.dataTransfer.setDragImage(e.currentTarget, 12, 12)
                    }
                  }
                : undefined
            }
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
              {locked ? '🔒 ' : ''}
              {ev.title}
            </div>
            <div className="truncate text-[10px] opacity-75">{minutesToLabel(ev.startMinutes)}</div>
          </button>
        )
      })}
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
