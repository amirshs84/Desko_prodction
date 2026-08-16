import {
  addDays,
  addMonths,
  addYears,
  isSameJalali,
  startOfPersianWeek,
  todayJalali,
  type JalaliDate,
} from './jalaliUtils'
import { calPathDay, calPathMonth, calPathWeek, calPathYear, getCalendarBase } from './paths'

export type CalendarTab = 'year' | 'month' | 'week' | 'day'

export const PERIOD_SHIFT_LABEL: Record<CalendarTab, { prev: string; next: string }> = {
  day: { prev: 'روز قبل', next: 'روز بعد' },
  week: { prev: 'هفته قبل', next: 'هفته بعد' },
  month: { prev: 'ماه قبل', next: 'ماه بعد' },
  year: { prev: 'سال قبل', next: 'سال بعد' },
}

export function shiftPeriod(date: JalaliDate, tab: CalendarTab, delta: -1 | 1): JalaliDate {
  if (tab === 'day') return addDays(date.jy, date.jm, date.jd, delta)
  if (tab === 'week') return addDays(date.jy, date.jm, date.jd, delta * 7)
  if (tab === 'month') return addMonths(date.jy, date.jm, date.jd, delta)
  return addYears(date.jy, date.jm, date.jd, delta)
}

export function periodPath(tab: CalendarTab, date: JalaliDate): string {
  if (tab === 'year') return calPathYear(date.jy)
  if (tab === 'month') return calPathMonth(date.jy, date.jm)
  if (tab === 'week') return calPathWeek(date.jy, date.jm, date.jd)
  return calPathDay(date.jy, date.jm, date.jd)
}

export function parsePeriodFromPath(
  pathname: string,
): { tab: CalendarTab; date: JalaliDate } | null {
  const base = getCalendarBase()
  if (!pathname.startsWith(base)) return null
  const rest = pathname.slice(base.length).replace(/^\//, '')
  const parts = rest.split('/').filter(Boolean)
  const tab = parts[0]
  const nums = parts.slice(1).map((p) => Number(p))
  if (tab === 'year' && Number.isFinite(nums[0])) {
    return { tab, date: { jy: nums[0]!, jm: 1, jd: 1 } }
  }
  if (tab === 'month' && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
    return { tab, date: { jy: nums[0]!, jm: nums[1]!, jd: 1 } }
  }
  if (
    (tab === 'week' || tab === 'day') &&
    Number.isFinite(nums[0]) &&
    Number.isFinite(nums[1]) &&
    Number.isFinite(nums[2])
  ) {
    return { tab, date: { jy: nums[0]!, jm: nums[1]!, jd: nums[2]! } }
  }
  return null
}

export function isCurrentPeriod(tab: CalendarTab, date: JalaliDate, today = todayJalali()): boolean {
  if (tab === 'year') return date.jy === today.jy
  if (tab === 'month') return date.jy === today.jy && date.jm === today.jm
  if (tab === 'day') return isSameJalali(date, today)
  const a = startOfPersianWeek(date.jy, date.jm, date.jd)
  const b = startOfPersianWeek(today.jy, today.jm, today.jd)
  return isSameJalali(a, b)
}
