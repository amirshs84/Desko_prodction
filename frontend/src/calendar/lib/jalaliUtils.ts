import jalaali from 'jalaali-js'

export type JalaliDate = { jy: number; jm: number; jd: number }

export function gregorianToJalaali(d: Date): JalaliDate {
  const { jy, jm, jd } = jalaali.toJalaali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  )
  return { jy, jm, jd }
}

export function jalaaliToDate(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd)
  return new Date(gy, gm - 1, gd)
}

/** شنبه = ۰ … جمعه = ۶ */
export function jalaliWeekDay(jy: number, jm: number, jd: number): number {
  const dt = jalaaliToDate(jy, jm, jd)
  const js = dt.getDay()
  return (js + 1) % 7
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm)
}

export function addDays(jy: number, jm: number, jd: number, delta: number): JalaliDate {
  const g = jalaaliToDate(jy, jm, jd)
  g.setDate(g.getDate() + delta)
  const { jy: y, jm: m, jd: d } = jalaali.toJalaali(
    g.getFullYear(),
    g.getMonth() + 1,
    g.getDate(),
  )
  return { jy: y, jm: m, jd: d }
}

export function startOfPersianWeek(jy: number, jm: number, jd: number): JalaliDate {
  const w = jalaliWeekDay(jy, jm, jd)
  return addDays(jy, jm, jd, -w)
}

export function weekDaysFromDate(jy: number, jm: number, jd: number): JalaliDate[] {
  const start = startOfPersianWeek(jy, jm, jd)
  const out: JalaliDate[] = []
  let cur = { ...start }
  for (let i = 0; i < 7; i++) {
    out.push({ ...cur })
    cur = addDays(cur.jy, cur.jm, cur.jd, 1)
  }
  return out
}

export type MonthCell = JalaliDate | null

export function monthGrid(jy: number, jm: number): MonthCell[][] {
  const len = jalaaliMonthLength(jy, jm)
  const firstWd = jalaliWeekDay(jy, jm, 1)
  const cells: MonthCell[] = []
  for (let i = 0; i < firstWd; i++) cells.push(null)
  for (let d = 1; d <= len; d++) cells.push({ jy, jm, jd: d })
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }
  return rows
}

export function isSameJalali(
  a: JalaliDate,
  b: JalaliDate,
): boolean {
  return a.jy === b.jy && a.jm === b.jm && a.jd === b.jd
}

export function todayJalali(): JalaliDate {
  return gregorianToJalaali(new Date())
}
