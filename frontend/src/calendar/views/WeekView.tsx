import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarFrame } from '../components/CalendarFrame'
import { DayTimedColumn, HourGutter } from '../components/DayTimedColumn'
import { EventModal, type EventModalInitial } from '../components/EventModal'
import { SchedulerFab, type SchedulerAction } from '../components/SchedulerFab'
import { useEvents } from '../context/EventsContext'
import { useEventModalActions } from '../hooks/useEventModalActions'
import { useSelectedDay } from '../context/SelectedDayContext'
import {
  isSameJalali,
  jalaliWeekDay,
  weekDaysFromDate,
  todayJalali,
  type JalaliDate,
} from '../lib/jalaliUtils'
import { formatMonthYear, WEEKDAY_FULL } from '../lib/labels'
import { HOUR_PX } from '../components/timeGrid'
import type { CalendarEventRecord } from '../types/calendar'
import { useSubjects, useSessions } from '../../hooks/useDataQueries'
import {
  buildCompleteWeekPlan,
  buildWeaknessAdjustments,
  type SchedulerSubject,
} from '../lib/schedulerEngine'

function parseIntParam(s: string | undefined, fallback: number): number {
  const n = Number(s)
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

const GUTTER_W = 'w-10 shrink-0 sm:w-11'

export function WeekView() {
  const { jy: jys, jm: jms, jd: jds } = useParams()
  const today = todayJalali()
  const jy = parseIntParam(jys, today.jy)
  const jm = parseIntParam(jms, today.jm)
  const jd = parseIntParam(jds, today.jd)

  const { selected, setSelected } = useSelectedDay()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EventModalInitial | null>(null)
  const [editing, setEditing] = useState<CalendarEventRecord | null>(null)
  const [slot, setSlot] = useState<{ d: JalaliDate; hour: number } | null>(null)
  const [schedulerBusy, setSchedulerBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { events, eventsForDay, eventsForRange, addEventsBatch, updateEvent, moveEvent } =
    useEvents()
  const { data: subjectsRaw = [] } = useSubjects()
  const { data: sessionsRaw = [] } = useSessions()
  const closeModal = () => {
    setOpen(false)
    setEditing(null)
  }
  const { groupSize, onSave, onDelete } = useEventModalActions(editing, closeModal)

  const days = useMemo(() => weekDaysFromDate(jy, jm, jd), [jy, jm, jd])

  const subjects = useMemo<SchedulerSubject[]>(
    () =>
      (subjectsRaw as { id: number; name: string; color_code: string }[]).map((s) => ({
        id: s.id,
        name: s.name,
        color_code: s.color_code,
      })),
    [subjectsRaw],
  )

  const sessions = useMemo(
    () =>
      (sessionsRaw as { subject_name: string; duration_seconds: number }[]).map((s) => ({
        subject_name: s.subject_name,
        duration_seconds: s.duration_seconds,
      })),
    [sessionsRaw],
  )

  const weekEvents = useMemo(
    () => eventsForRange(days[0]!, 7),
    [eventsForRange, days],
  )

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    setSelected({ jy, jm, jd })
  }, [jy, jm, jd, setSelected])

  const showToast = (message: string) => setToast(message)

  const handleDropEvent = async (
    eventId: string,
    target: { date: JalaliDate; startMinutes: number },
  ) => {
    const result = await moveEvent(eventId, target)
    if (result.snapped) {
      showToast('جای هدف شلوغ بود؛ رویداد به نزدیک‌ترین اسلات آزاد منتقل شد.')
    }
  }

  const runScheduler = async (action: SchedulerAction) => {
    if (action === 'advisor') {
      showToast('درخواست شما به مشاور فرستاده شد.')
      return
    }

    if (subjects.length === 0) {
      showToast('ابتدا در بخش درس‌ها، حداقل یک درس اضافه کنید.')
      return
    }

    setSchedulerBusy(true)
    try {
      if (action === 'complete') {
        const plan = buildCompleteWeekPlan(days, subjects, weekEvents)
        if (plan.length === 0) {
          showToast('برای این هفته اسلات خالی پیدا نشد.')
          return
        }
        await addEventsBatch(
          plan.map((p) => ({
            date: p.date,
            title: p.title,
            description: p.description,
            startMinutes: p.startMinutes,
            endMinutes: p.endMinutes,
            allDay: p.allDay,
            color: p.color,
          })),
        )
        showToast(`${plan.length} رویداد به برنامه هفتگی اضافه شد.`)
        return
      }

      const { creates, updates } = buildWeaknessAdjustments(
        days,
        subjects,
        sessions,
        events,
      )
      updates.forEach(({ id, patch }) => updateEvent(id, patch))

      if (creates.length > 0) {
        await addEventsBatch(
          creates.map((p) => ({
            date: p.date,
            title: p.title,
            description: p.description,
            startMinutes: p.startMinutes,
            endMinutes: p.endMinutes,
            allDay: p.allDay,
            color: p.color,
          })),
        )
      }

      if (updates.length === 0 && creates.length === 0) {
        showToast('تغییری برای اعمال پیدا نشد.')
        return
      }

      const parts: string[] = []
      if (updates.length > 0) parts.push(`${updates.length} رویداد اصلاح شد`)
      if (creates.length > 0) parts.push(`${creates.length} جلسه تقویتی اضافه شد`)
      showToast(parts.join(' · '))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در برنامه‌ریزی خودکار.')
    } finally {
      setSchedulerBusy(false)
    }
  }

  const openCreate = (d: JalaliDate, minute: number) => {
    const quarter = Math.floor(minute / 15) * 15
    const end = Math.min(quarter + 60, 24 * 60)
    setEditing(null)
    setDraft({ date: d, startMinutes: quarter, endMinutes: end, allDay: false })
    setOpen(true)
  }

  const openFab = () => {
    openCreate(selected, 9 * 60)
  }

  const openEdit = (e: CalendarEventRecord) => {
    setSlot(null)
    setEditing(e)
    setSelected({ jy: e.jy, jm: e.jm, jd: e.jd })
    setDraft({
      date: { jy: e.jy, jm: e.jm, jd: e.jd },
      startMinutes: e.startMinutes,
      endMinutes: e.endMinutes,
      allDay: e.allDay,
    })
    setOpen(true)
  }

  const makePointerHandler =
    (d: JalaliDate) => (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_PX)))
      setSelected(d)
      if (slot && isSameJalali(slot.d, d) && slot.hour === hour) {
        openCreate(d, hour * 60)
        setSlot(null)
      } else {
        setSlot({ d, hour })
      }
    }

  return (
    <>
      <CalendarFrame
        title={formatMonthYear(jy, jm)}
        subtitle="نمای هفته"
        active="week"
        onFab={openFab}
        extraFab={<SchedulerFab disabled={schedulerBusy} onAction={runScheduler} />}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className={`flex shrink-0 flex-row border-b border-[var(--t-edge)] bg-black/40`} dir="rtl">
            <div className={GUTTER_W} aria-hidden />
            <div className="flex min-w-0 flex-1">
              {days.map((d) => {
                const w = jalaliWeekDay(d.jy, d.jm, d.jd)
                const sel = isSameJalali(d, selected)
                return (
                  <div
                    key={`${d.jy}-${d.jm}-${d.jd}`}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 border-s border-[var(--t-edge)] py-2 ${
                      sel ? 'bg-[rgba(16,185,129,0.12)]' : ''
                    }`}
                  >
                    <div
                      className={`px-0.5 text-center text-[9px] font-bold leading-tight sm:text-[11px] ${w === 6 ? 'text-[var(--t-friday)]' : 'text-[var(--t-ink-3)]'}`}
                    >
                      {WEEKDAY_FULL[w]}
                    </div>
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold sm:h-10 sm:w-10 ${sel ? 'border border-[var(--t-brand-2)]' : ''}`}
                    >
                      {String(d.jd).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[Number(x)])}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <AllDayStrip days={days} eventsForDay={eventsForDay} onEdit={(e) => openEdit(e)} />

          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch overscroll-y-contain">
            <div className="flex min-h-0 flex-row" dir="rtl">
              <HourGutter />
              <div className="flex min-w-0 flex-1">
                {days.map((d) => (
                  <DayTimedColumn
                    key={`${d.jy}-${d.jm}-${d.jd}`}
                    date={d}
                    events={eventsForDay(d)}
                    weekSlot={{
                      selectedHour:
                        slot && isSameJalali(slot.d, d) ? slot.hour : null,
                      showHighlight: true,
                      onBackgroundPointer: makePointerHandler(d),
                    }}
                    onEdit={(ev) => openEdit(ev)}
                    onDropEvent={handleDropEvent}
                  />
                ))}
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

function AllDayStrip({
  days,
  eventsForDay,
  onEdit,
}: {
  days: JalaliDate[]
  eventsForDay: (d: JalaliDate) => CalendarEventRecord[]
  onEdit: (e: CalendarEventRecord) => void
}) {
  return (
    <div className="flex max-h-[96px] shrink-0 flex-row border-b border-[var(--t-edge)] bg-black/30" dir="rtl">
      <div className={GUTTER_W} aria-hidden />
      <div className="flex min-w-0 flex-1">
        {days.map((d) => {
          const evs = eventsForDay(d).filter((e) => e.allDay)
          return (
            <div
              key={`${d.jy}-${d.jm}-${d.jd}-allday`}
              className="flex min-w-0 flex-1 flex-col gap-1 border-s border-[var(--t-edge)] p-1"
            >
              {evs.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  data-cal-event="1"
                  onClick={() => onEdit(e)}
                  className="truncate rounded-md px-1 py-0.5 text-start text-[10px] font-bold text-black"
                  style={{ background: e.color }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
