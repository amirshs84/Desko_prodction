import type { CalendarEventRecord } from '../types/calendar'
import { isSameJalali, jalaliWeekDay, type JalaliDate } from './jalaliUtils'

export type SchedulerSubject = { id: number; name: string; color_code: string }
export type SchedulerSession = { subject_name: string; duration_seconds: number }

export type ScheduledEventInput = {
  date: JalaliDate
  title: string
  description: string
  startMinutes: number
  endMinutes: number
  allDay: boolean
  color: string
}

export type SchedulerUpdate = {
  id: string
  patch: Pick<CalendarEventRecord, 'startMinutes' | 'endMinutes' | 'description'>
}

type ActivityKind = 'read' | 'solve' | 'review'

const TIME_SHIFTS = [-60, -30, 30, 60]

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  read: 'خواندن',
  solve: 'حل سوال',
  review: 'مرور',
}

/** اسلات‌های ثابت: صبح / عصر / شب */
const PERIOD_SLOTS: Record<ActivityKind, { start: number; duration: number }[]> = {
  read: [
    { start: 8 * 60, duration: 60 },
    { start: 9 * 60 + 15, duration: 60 },
    { start: 10 * 60 + 30, duration: 60 },
    { start: 11 * 60 + 45, duration: 45 },
  ],
  solve: [
    { start: 15 * 60, duration: 75 },
    { start: 16 * 60 + 30, duration: 75 },
    { start: 17 * 60 + 45, duration: 60 },
  ],
  review: [
    { start: 19 * 60 + 30, duration: 45 },
    { start: 20 * 60 + 30, duration: 45 },
    { start: 21 * 60 + 15, duration: 45 },
    { start: 22 * 60, duration: 40 },
  ],
}

function dayTimedEvents(events: CalendarEventRecord[], day: JalaliDate) {
  return events.filter(
    (e) => isSameJalali({ jy: e.jy, jm: e.jm, jd: e.jd }, day) && !e.allDay,
  )
}

function overlaps(start: number, end: number, events: CalendarEventRecord[]): boolean {
  return events.some((e) => start < e.endMinutes && end > e.startMinutes)
}

function pseudoEvent(day: JalaliDate, start: number, end: number): CalendarEventRecord {
  return {
    id: '__pseudo__',
    jy: day.jy,
    jm: day.jm,
    jd: day.jd,
    title: '',
    description: '',
    startMinutes: start,
    endMinutes: end,
    color: '',
    allDay: false,
    createdAt: '',
  }
}

function tryPlace(
  day: JalaliDate,
  subject: SchedulerSubject,
  kind: ActivityKind,
  slotIndex: number,
  workingEvents: CalendarEventRecord[],
): ScheduledEventInput | null {
  const slots = PERIOD_SLOTS[kind]
  const timed = dayTimedEvents(workingEvents, day)

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[(slotIndex + i) % slots.length]!
    const { start, duration } = slot
    const end = start + duration
    if (end > 24 * 60) continue
    if (overlaps(start, end, timed)) continue

    return {
      date: { ...day },
      title: `${ACTIVITY_LABELS[kind]} ${subject.name}`,
      description: 'برنامهٔ خودکار — تکمیل هفتگی',
      startMinutes: start,
      endMinutes: end,
      allDay: false,
      color: subject.color_code || '#10b981',
    }
  }

  return null
}

/** تعداد درس‌های هر روز: ۴+ درس → ۳ تا؛ کمتر → همه */
function subjectsPerDay(count: number): number {
  if (count <= 3) return count
  return 3
}

/** چرخش درس‌ها بین روزها تا همه پوشش داده شوند */
function pickDaySubjects(
  subjects: SchedulerSubject[],
  dayIndex: number,
): SchedulerSubject[] {
  const n = subjects.length
  const k = subjectsPerDay(n)
  if (k >= n) return [...subjects]

  const picked: SchedulerSubject[] = []
  const offset = dayIndex % n
  for (let i = 0; i < k; i++) {
    picked.push(subjects[(offset + i) % n]!)
  }
  return picked
}

/** تکمیل برنامه هفتگی — شنبه تا پنج‌شنبه، ترکیب خواندن / حل سوال / مرور */
export function buildCompleteWeekPlan(
  weekDays: JalaliDate[],
  subjects: SchedulerSubject[],
  existingEvents: CalendarEventRecord[],
): ScheduledEventInput[] {
  if (subjects.length === 0) return []

  const studyDays = weekDays.filter((d) => jalaliWeekDay(d.jy, d.jm, d.jd) !== 6)
  if (studyDays.length === 0) return []

  const workingEvents = [...existingEvents]
  const planned: ScheduledEventInput[] = []

  studyDays.forEach((day, dayIndex) => {
    const daySubjects = pickDaySubjects(subjects, dayIndex)

    daySubjects.forEach((subject, subjectIndex) => {
      const activities: ActivityKind[] = ['read', 'solve', 'review']

      activities.forEach((kind) => {
        const event = tryPlace(day, subject, kind, subjectIndex, workingEvents)
        if (!event) return
        planned.push(event)
        workingEvents.push(pseudoEvent(day, event.startMinutes, event.endMinutes))
      })
    })
  })

  return planned
}

function rankWeakSubjects(
  subjects: SchedulerSubject[],
  sessions: SchedulerSession[],
): SchedulerSubject[] {
  const totals = new Map<string, number>()
  subjects.forEach((s) => totals.set(s.name, 0))
  sessions.forEach((sess) => {
    const cur = totals.get(sess.subject_name) ?? 0
    totals.set(sess.subject_name, cur + (sess.duration_seconds || 0))
  })

  return [...subjects]
    .sort((a, b) => (totals.get(a.name) ?? 0) - (totals.get(b.name) ?? 0))
    .slice(0, Math.min(2, subjects.length))
}

function findAnyFreeSlot(
  day: JalaliDate,
  events: CalendarEventRecord[],
  duration = 60,
): number | null {
  const timed = dayTimedEvents(events, day)
  for (let start = 8 * 60; start <= 21 * 60; start += 30) {
    const end = start + duration
    if (end <= 22 * 60 + 30 && !overlaps(start, end, timed)) return start
  }
  return null
}

/** اصلاح جزئی برنامه بر اساس نقاط ضعف (فقط داده جلسات مطالعه) */
export function buildWeaknessAdjustments(
  weekDays: JalaliDate[],
  subjects: SchedulerSubject[],
  sessions: SchedulerSession[],
  existingEvents: CalendarEventRecord[],
): { creates: ScheduledEventInput[]; updates: SchedulerUpdate[] } {
  const weekKeys = new Set(weekDays.map((d) => `${d.jy}-${d.jm}-${d.jd}`))
  const timedWeek = existingEvents.filter(
    (e) => weekKeys.has(`${e.jy}-${e.jm}-${e.jd}`) && !e.allDay,
  )

  let workingEvents = [...existingEvents]
  const updates: SchedulerUpdate[] = []
  const creates: ScheduledEventInput[] = []

  const shuffled = [...timedWeek].sort(() => Math.random() - 0.5)
  let shiftCount = 0
  for (const ev of shuffled) {
    if (shiftCount >= 2) break
    const shift = TIME_SHIFTS[Math.floor(Math.random() * TIME_SHIFTS.length)]!
    const newStart = Math.max(8 * 60, Math.min(21 * 60, ev.startMinutes + shift))
    const duration = ev.endMinutes - ev.startMinutes
    const newEnd = newStart + duration
    if (newEnd > 22 * 60 + 30) continue

    const day = { jy: ev.jy, jm: ev.jm, jd: ev.jd }
    const others = dayTimedEvents(workingEvents, day).filter((e) => e.id !== ev.id)
    if (overlaps(newStart, newEnd, others)) continue

    updates.push({
      id: ev.id,
      patch: {
        startMinutes: newStart,
        endMinutes: newEnd,
        description: ev.description
          ? `${ev.description} · اصلاح خودکار`
          : 'اصلاح خودکار بر اساس نقاط ضعف',
      },
    })

    workingEvents = workingEvents.map((e) =>
      e.id === ev.id ? { ...e, startMinutes: newStart, endMinutes: newEnd } : e,
    )
    shiftCount++
  }

  const weakSubjects = rankWeakSubjects(subjects, sessions)
  const studyDays = weekDays.filter((d) => jalaliWeekDay(d.jy, d.jm, d.jd) !== 6)

  weakSubjects.forEach((subject) => {
    if (studyDays.length === 0) return
    const day = studyDays[Math.floor(Math.random() * studyDays.length)]!
    const start = findAnyFreeSlot(day, workingEvents, 60)
    if (start === null) return

    const end = start + 60
    creates.push({
      date: { ...day },
      title: `تمرکز ${subject.name}`,
      description: 'اصلاح خودکار — تقویت نقاط ضعف',
      startMinutes: start,
      endMinutes: end,
      allDay: false,
      color: subject.color_code || '#a855f7',
    })
    workingEvents.push(pseudoEvent(day, start, end))
  })

  return { creates, updates }
}
