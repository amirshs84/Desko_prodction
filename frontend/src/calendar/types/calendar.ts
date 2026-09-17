import type { JalaliDate } from '../lib/jalaliUtils'
import { toFaDigits } from '../lib/persianDigits'

/** تکرار رویداد نسبت به هفتۀ تقویمی شروع‌شده از شنبه (بر اساس تاریخ انتخاب‌شده) */
export type EventRepeatScope = 'none' | 'full_week' | 'odd_days' | 'even_days' | 'all_weeks'

/** ویرایش/حذف فقط این رویداد یا کل گروه تکرار */
export type EventEditScope = 'single' | 'group'

export type CalendarEventKind = 'mutable' | 'immutable'

export interface CalendarEventRecord {
  id: string
  /** شناسه گروه — رویدادهای ایجادشده با تکرار */
  groupId?: string
  /** تاریخ رویداد (شمسی) */
  jy: number
  jm: number
  jd: number
  title: string
  description: string
  /** دقیقه از نیمه‌شب [0, 1440) برای رویدادهای دارای زمان */
  startMinutes: number
  endMinutes: number
  color: string
  allDay: boolean
  createdAt: string
  /** ثابت مدرسه — قابل جابه‌جایی/حذف توسط دانش‌آموز یا مشاور نیست */
  kind?: CalendarEventKind
  origin?: string
  version?: number
  /** اهمیت ۱ تا ۵ — موتور هنگام کمبود زمان بلوک‌های کم‌اهمیت را کوتاه می‌کند */
  priority?: number
  /** شناوری ۰ تا ۴ — صفر یعنی میخ‌شده */
  movability?: number
  subjectTags?: string[]
  cognitiveLoad?: number
  /** بلوک پیشنهادی مشاور — هنوز روی تقویم قطعی نشده */
  proposed?: boolean
  proposalId?: number
  blockIndex?: number
  consultantId?: number
}

export interface EventDraft {
  date: JalaliDate
  startMinutes: number
  endMinutes: number
  title: string
  description: string
  allDay: boolean
}

export const STORAGE_KEY = 'desko-calendar-demo-events-v1'

export function minutesToLabel(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  const raw = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return toFaDigits(raw)
}

export function parseTimeToMinutes(h: number, min: number): number {
  const hh = Math.max(0, Math.min(23, h))
  const mm = Math.max(0, Math.min(59, min))
  return hh * 60 + mm
}
