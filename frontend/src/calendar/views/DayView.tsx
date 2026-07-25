import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarFrame } from '../components/CalendarFrame'
import { DayTimedColumn, HourGutter } from '../components/DayTimedColumn'
import { EventModal, type EventModalInitial } from '../components/EventModal'
import { useEvents } from '../context/EventsContext'
import { useEventModalActions } from '../hooks/useEventModalActions'
import { useSelectedDay } from '../context/SelectedDayContext'
import { jalaliWeekDay, todayJalali, type JalaliDate } from '../lib/jalaliUtils'
import { formatMonthYear, WEEKDAY_FULL } from '../lib/labels'
import { toFaDigits } from '../lib/persianDigits'
import type { CalendarEventRecord } from '../types/calendar'

function parseIntParam(s: string | undefined, fallback: number): number {
  const n = Number(s)
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

export function DayView() {
  const { jy: jys, jm: jms, jd: jds } = useParams()
  const today = todayJalali()
  const jy = parseIntParam(jys, today.jy)
  const jm = parseIntParam(jms, today.jm)
  const jd = parseIntParam(jds, today.jd)

  const { setSelected } = useSelectedDay()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EventModalInitial | null>(null)
  const [editing, setEditing] = useState<CalendarEventRecord | null>(null)

  const { eventsForDay, moveEvent } = useEvents()
  const [toast, setToast] = useState<string | null>(null)
  const closeModal = () => {
    setOpen(false)
    setEditing(null)
  }
  const { groupSize, onSave, onDelete } = useEventModalActions(editing, closeModal)
  const date: JalaliDate = { jy, jm, jd }
  const evs = eventsForDay(date)
  const w = jalaliWeekDay(jy, jm, jd)

  useEffect(() => {
    setSelected({ jy, jm, jd })
  }, [jy, jm, jd, setSelected])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const handleDropEvent = async (
    eventId: string,
    target: { date: JalaliDate; startMinutes: number },
  ) => {
    const result = await moveEvent(eventId, target)
    if (result.snapped) {
      setToast('جای هدف شلوغ بود؛ رویداد به نزدیک‌ترین اسلات آزاد منتقل شد.')
    }
  }

  const openCreate = (minute: number) => {
    const quarter = Math.floor(minute / 15) * 15
    const end = Math.min(quarter + 60, 24 * 60)
    setEditing(null)
    setDraft({ date, startMinutes: quarter, endMinutes: end, allDay: false })
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

  const allDays = evs.filter((e) => e.allDay)

  const title = `${WEEKDAY_FULL[w]} ${toFaDigits(jd)}`

  return (
    <>
      <CalendarFrame
        title={title}
        subtitle={formatMonthYear(jy, jm)}
        active="day"
        onFab={() => openCreate(9 * 60)}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-[var(--t-edge)] bg-black/35 px-3 py-2">
            {allDays.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {allDays.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    data-cal-event="1"
                    onClick={() => openEdit(e)}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-black"
                    style={{ background: e.color }}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch overscroll-y-contain">
            <div className="flex min-h-0 flex-row" dir="rtl">
              <HourGutter />
              <div className="min-w-0 flex-1">
                <DayTimedColumn
                  date={date}
                  events={evs}
                  onSimpleCreate={openCreate}
                  onEdit={openEdit}
                  onDropEvent={handleDropEvent}
                  rtlLanes
                />
              </div>
            </div>
          </div>
        </div>
      </CalendarFrame>

      <EventModal
        open={open}
        mode={editing ? 'edit' : 'create'}
        initial={
          draft ?? {
            date,
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

      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-4 z-[100] mx-auto max-w-md rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] px-4 py-3 text-center text-sm font-semibold text-[var(--t-ink)] shadow-xl"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
