import type { CalendarEventRecord } from '../types/calendar'

export type LaidOutEvent = CalendarEventRecord & { lane: number; laneCount: number }

/** چیدمان کنارهم برای رویدادهای هم‌پوشان (مشابه گوگل کلندر) */
export function layoutTimedEvents(
  events: CalendarEventRecord[],
  options?: { rtlLanes?: boolean },
): LaidOutEvent[] {
  const timed = events.filter((e) => !e.allDay)
  const sorted = [...timed].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

  const laneEnds: number[] = []
  const out: LaidOutEvent[] = []

  for (const e of sorted) {
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane] > e.startMinutes) {
      lane += 1
    }
    if (lane === laneEnds.length) laneEnds.push(e.endMinutes)
    else laneEnds[lane] = Math.max(laneEnds[lane], e.endMinutes)

    out.push({ ...e, lane, laneCount: 0 })
  }

  const maxLane = out.reduce((m, e) => Math.max(m, e.lane), 0)
  const count = maxLane + 1
  return out.map((e) => ({
    ...e,
    laneCount: count,
  }))
}
