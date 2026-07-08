import { toFaDigits } from './persianDigits'

export const JALALI_MONTHS_ROWED: string[][] = [
  ['فروردین', 'اردیبهشت', 'خرداد'],
  ['تیر', 'مرداد', 'شهریور'],
  ['مهر', 'آبان', 'آذر'],
  ['دی', 'بهمن', 'اسفند'],
]

export const JALALI_MONTHS: string[] = JALALI_MONTHS_ROWED.flat()

export const WEEKDAY_SHORT = ['شن', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمع'] as const

export const WEEKDAY_FULL = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const

export function formatMonthYear(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`
}
