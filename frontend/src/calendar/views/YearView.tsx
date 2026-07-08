import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarFrame } from '../components/CalendarFrame'
import { EventModal, type EventModalInitial } from '../components/EventModal'
import { useEvents } from '../context/EventsContext'
import { useSelectedDay } from '../context/SelectedDayContext'
import {
  isSameJalali,
  jalaliWeekDay,
  monthGrid,
  todayJalali,
  type JalaliDate,
} from '../lib/jalaliUtils'
import { JALALI_MONTHS_ROWED } from '../lib/labels'
import { toFaDigits } from '../lib/persianDigits'
import { calPathMonth } from '../lib/paths'

function parseYear(s: string | undefined): number {
  const n = Number(s)
  if (!Number.isFinite(n) || n < 1300 || n > 1500) return todayJalali().jy
  return Math.floor(n)
}

export function YearView() {
  const { jy: jyParam } = useParams()
  const jy = useMemo(() => parseYear(jyParam), [jyParam])
  const nav = useNavigate()
  const today = todayJalali()
  const { selected } = useSelectedDay()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EventModalInitial | null>(null)
  const { addEvent } = useEvents()

  const openQuickAdd = (d: JalaliDate) => {
    setDraft({
      date: d,
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      allDay: false,
    })
    setOpen(true)
  }

  return (
    <>
      <CalendarFrame
        title={toFaDigits(jy)}
        subtitle="نمای سال — تقویم رسمی ایران"
        active="year"
        onFab={() => openQuickAdd(selected)}
      >
        <div className="h-full overflow-y-auto scroll-touch px-2 py-3">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2 sm:gap-3">
            {JALALI_MONTHS_ROWED.flatMap((row, ri) =>
              row.map((name, ci) => {
                const jm = ri * 3 + ci + 1
                return (
                  <button
                    type="button"
                    key={`${name}-${jm}`}
                    onClick={() => nav(calPathMonth(jy, jm))}
                    className="rounded-2xl border border-[var(--t-edge-2)] bg-[var(--t-card)] p-2 text-right shadow-sm transition hover:border-[var(--t-brand-2)] active:scale-[0.99] sm:p-3"
                  >
                    <div className="mb-2 text-center text-[11px] font-bold text-[var(--t-ink)] sm:text-sm">
                      {name}
                    </div>
                    <MiniMonth jy={jy} jm={jm} today={today} />
                  </button>
                )
              }),
            )}
          </div>
        </div>
      </CalendarFrame>

      <EventModal
        open={open}
        mode="create"
        initial={
          draft ?? {
            date: { jy, jm: 1, jd: 1 },
            startMinutes: 9 * 60,
            endMinutes: 10 * 60,
            allDay: false,
          }
        }
        onClose={() => setOpen(false)}
        onSave={(p, _scope) => {
          addEvent({
            date: p.date,
            title: p.title,
            description: p.description,
            startMinutes: p.startMinutes,
            endMinutes: p.endMinutes,
            allDay: p.allDay,
            color: p.color,
            repeat: p.repeat,
          })
          setOpen(false)
        }}
      />
    </>
  )
}

function MiniMonth({ jy, jm, today }: { jy: number; jm: number; today: JalaliDate }) {
  const rows = monthGrid(jy, jm)
  return (
    <div dir="rtl" className="select-none">
      <div className="grid grid-cols-7 gap-px text-[7px] text-[var(--t-ink-3)] sm:text-[9px]">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((x) => (
          <div key={x} className="text-center font-semibold">
            {x}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-px">
        {rows.flatMap((r) =>
          r.map((c, i) => (
            <div
              key={i}
              className={`flex h-5 items-center justify-center rounded-sm sm:h-6 ${
                c && isSameJalali(c, today)
                  ? 'ring-1 ring-[var(--t-brand-2)] ring-inset'
                  : ''
              } ${c && jalaliWeekDay(c.jy, c.jm, c.jd) === 6 ? 'text-[var(--t-friday)]' : ''}`}
            >
              {c ? (
                <span className="text-[9px] font-medium sm:text-[11px]">{toFaDigits(c.jd)}</span>
              ) : null}
            </div>
          )),
        )}
      </div>
    </div>
  )
}
