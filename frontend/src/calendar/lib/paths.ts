/** پایه مسیر تقویم — در پنل مشاور به `/consultant/student/:id/calendar` سوییچ می‌شود. */
let calendarBase = '/calendar'

export function getCalendarBase() {
  return calendarBase
}

export function setCalendarBase(base: string) {
  calendarBase = base.replace(/\/$/, '') || '/calendar'
}

export const CALENDAR_BASE = '/calendar' as const

export function calPathYear(jy: number) {
  return `${calendarBase}/year/${jy}`
}

export function calPathMonth(jy: number, jm: number) {
  return `${calendarBase}/month/${jy}/${jm}`
}

export function calPathWeek(jy: number, jm: number, jd: number) {
  return `${calendarBase}/week/${jy}/${jm}/${jd}`
}

export function calPathDay(jy: number, jm: number, jd: number) {
  return `${calendarBase}/day/${jy}/${jm}/${jd}`
}

export function calPathHomework() {
  return `${calendarBase}/homework`
}

export function calPathHomeworkDetail(id: string) {
  return `${calendarBase}/homework/${encodeURIComponent(id)}`
}

export function calPathAiAssistant() {
  return `/ai-assistant`
}
