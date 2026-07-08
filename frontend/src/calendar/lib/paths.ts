export const CALENDAR_BASE = '/calendar' as const

export function calPathYear(jy: number) {
  return `${CALENDAR_BASE}/year/${jy}`
}

export function calPathMonth(jy: number, jm: number) {
  return `${CALENDAR_BASE}/month/${jy}/${jm}`
}

export function calPathWeek(jy: number, jm: number, jd: number) {
  return `${CALENDAR_BASE}/week/${jy}/${jm}/${jd}`
}

export function calPathDay(jy: number, jm: number, jd: number) {
  return `${CALENDAR_BASE}/day/${jy}/${jm}/${jd}`
}

export function calPathHomework() {
  return `${CALENDAR_BASE}/homework`
}

export function calPathHomeworkDetail(id: string) {
  return `${CALENDAR_BASE}/homework/${encodeURIComponent(id)}`
}

export function calPathAiAssistant() {
  return `/ai-assistant`
}
