import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarFrame } from '../components/CalendarFrame'
import { EventModal, type EventModalInitial } from '../components/EventModal'
import { useEvents } from '../context/EventsContext'
import { useEventModalActions } from '../hooks/useEventModalActions'
import { useSelectedDay } from '../context/SelectedDayContext'
import {
  isSameJalali,
  jalaliWeekDay,
  monthGrid,
  todayJalali,
  type JalaliDate,
} from '../lib/jalaliUtils'
import { formatMonthYear, WEEKDAY_FULL } from '../lib/labels'
import { toFaDigits } from '../lib/persianDigits'
import type { CalendarEventRecord } from '../types/calendar'
import { minutesToLabel } from '../types/calendar'
import { calPathWeek } from '../lib/paths'

function parseIntParam(s: string | undefined, fallback: number): number {
  const n = Number(s)
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

export function MonthView() {
  const { jy: jys, jm: jms } = useParams()
  const today = todayJalali()
  const jy = parseIntParam(jys, today.jy)
  const jm = Math.min(12, Math.max(1, parseIntParam(jms, today.jm)))
  const nav = useNavigate()

  const { selected, setSelected, isSelected } = useSelectedDay()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EventModalInitial | null>(null)
  const [editing, setEditing] = useState<CalendarEventRecord | null>(null)

  const { eventsForDay } = useEvents()
  const closeModal = () => {
    setOpen(false)
    setEditing(null)
  }
  const { groupSize, onSave, onDelete } = useEventModalActions(editing, closeModal)

  const rows = useMemo(() => monthGrid(jy, jm), [jy, jm])

  const openCreate = (d: JalaliDate, start = 9 * 60, end = 10 * 60, allDay = false) => {
    setEditing(null)
    setDraft({ date: d, startMinutes: start, endMinutes: end, allDay })
    setOpen(true)
  }

  const openEdit = (e: CalendarEventRecord) => {
    setEditing(e)
    setDraft({
      date: { jy: e.jy, jm: e.jm, jd: e.jd },
      startMinutes: e.startMinutes,
      endMinutes: e.endMinutes,
      allDay: e.allDay,
    })
    setOpen(true)
  }

  return (
    <>
      <CalendarFrame
        title={formatMonthYear(jy, jm)}
        active="month"
        onFab={() => openCreate(selected)}
      >
        <div className="h-full min-h-0 overflow-y-auto scroll-touch px-1 pb-2 pt-1">
          <div dir="rtl" className="mx-auto max-w-5xl">
            <div className="grid grid-cols-7 gap-1 border-b border-[var(--t-edge)] pb-2">
              {WEEKDAY_FULL.map((d) => (
                <div
                  key={d}
                  className="text-center text-[9px] font-bold leading-tight text-[var(--t-ink-3)] sm:text-[11px]"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1 flex flex-col gap-1">
              {rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7 gap-1">
                  {row.map((cell, ci) => (
                    <MonthDayCell
                      key={ci}
                      cell={cell}
                      today={today}
                      isSel={cell ? isSelected(cell) : false}
                      events={cell ? eventsForDay(cell) : []}
                      onSelectDay={(d) => setSelected(d)}
                      onOpenCreate={(d) => openCreate(d)}
                      onEdit={openEdit}
                      onOpenWeek={(d) => {
                        setSelected(d)
                        nav(calPathWeek(d.jy, d.jm, d.jd))
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CalendarFrame>

      <EventModal
        open={open}
        mode={editing ? 'edit' : 'create'}
        initial={
          draft ?? {
            date: selected,
            startMinutes: 9 * 60,
            endMinutes: 10 * 60,
            allDay: false,
          }
        }
        existing={editing ?? undefined}
        groupSize={groupSize}
        onClose={closeModal}
        onSave={onSave}
        onDelete={editing ? onDelete : undefined}
      />
    </>
  )
}

function MonthDayCell({
  cell,
  today,
  isSel,
  events,
  onSelectDay,
  onOpenCreate,
  onEdit,
  onOpenWeek,
}: {
  cell: JalaliDate | null
  today: JalaliDate
  isSel: boolean
  events: CalendarEventRecord[]
  onSelectDay: (d: JalaliDate) => void
  onOpenCreate: (d: JalaliDate) => void
  onEdit: (e: CalendarEventRecord) => void
  onOpenWeek: (d: JalaliDate) => void
}) {
  if (!cell) {
    return <div className="min-h-[100px] rounded-xl bg-transparent sm:min-h-[110px]" />
  }

  const w = jalaliWeekDay(cell.jy, cell.jm, cell.jd)
  const isToday = isSameJalali(cell, today)
  const allDays = events.filter((e) => e.allDay)
  const timed = events.filter((e) => !e.allDay)

  const ring = isSel
    ? 'ring-2 ring-[var(--t-brand-2)] ring-offset-2 ring-offset-black'
    : isToday
      ? 'ring-1 ring-white/20'
      : ''

  return (
    <div
      className={`flex min-h-[100px] flex-col rounded-xl border border-[var(--t-edge)] bg-[var(--t-card)] p-1 sm:min-h-[110px] ${ring}`}
    >
      <div className="flex items-start justify-end">
        <button
          type="button"
          onClick={() => {
            onSelectDay(cell)
            onOpenWeek(cell)
          }}
          className={`grid h-8 min-w-8 place-items-center rounded-lg text-sm font-bold ${
            w === 6 ? 'text-[var(--t-friday)]' : 'text-[var(--t-ink)]'
          }`}
        >
          {toFaDigits(cell.jd)}
        </button>
      </div>

      <div
        className="mt-1 min-h-0 flex-1 space-y-1 overflow-hidden"
        onClick={() => onSelectDay(cell)}
        role="presentation"
      >
        {allDays.map((e) => (
          <button
            key={e.id}
            type="button"
            data-cal-event="1"
            onClick={(ev) => {
              ev.stopPropagation()
              onEdit(e)
            }}
            className="block w-full truncate rounded-md px-1 py-0.5 text-start text-[10px] font-semibold"
            style={
              e.kind === 'immutable'
                ? { background: '#475569', color: '#f1f5f9' }
                : { background: e.color, color: '#081016' }
            }
          >
            {e.title}
          </button>
        ))}
        {timed.slice(0, 4).map((e) => (
          <button
            key={e.id}
            type="button"
            data-cal-event="1"
            className="flex w-full items-center gap-1 rounded-md bg-black/25 px-1 py-0.5 text-[10px] text-[var(--t-ink)]"
            style={
              e.kind === 'immutable'
                ? { background: '#475569', color: '#f1f5f9' }
                : e.proposed
                  ? {
                      backgroundImage:
                        'repeating-linear-gradient(-52deg, rgba(255,255,255,0.2) 0 4px, rgba(15,23,42,0.15) 4px 8px)',
                    }
                  : undefined
            }
            onClick={(ev) => {
              ev.stopPropagation()
              onEdit(e)
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
            <span className="truncate font-semibold">{e.title}</span>
            <span className="shrink-0 text-[9px] text-[var(--t-ink-3)]">
              {minutesToLabel(e.startMinutes)}
            </span>
          </button>
        ))}
        {timed.length > 4 ? (
          <div className="text-[9px] text-[var(--t-ink-3)]">+{toFaDigits(timed.length - 4)}</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelectDay(cell)
          onOpenCreate(cell)
        }}
        className="mt-1 min-h-[32px] w-full rounded-lg border border-dashed border-[var(--t-edge-2)] bg-black/20 px-1 py-1 text-center text-[10px] text-[var(--t-ink-3)]"
      >
        افزودن رویداد
      </button>
    </div>
  )
}
