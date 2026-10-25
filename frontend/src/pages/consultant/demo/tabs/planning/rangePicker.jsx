import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  isSameJalali,
  jalaaliMonthLength,
  monthGrid,
  startOfPersianWeek,
  todayJalali,
  addDays,
} from '../../../../../calendar/lib/jalaliUtils';
import { JALALI_MONTHS, WEEKDAY_SHORT } from '../../../../../calendar/lib/labels';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';
import { cmpDate, datesInRange, rangeLabel } from './weeklyPlanModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';

function spanOf(anchor, hover, start, end) {
  if (anchor && hover) {
    return cmpDate(anchor, hover) <= 0 ? [anchor, hover] : [hover, anchor];
  }
  return cmpDate(start, end) <= 0 ? [start, end] : [end, start];
}

export function RangePicker({ start, end, onChange, onOpen }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => ({ jy: start.jy, jm: start.jm }));
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const today = todayJalali();
  const [from, to] = spanOf(anchor, hover, start, end);
  const count = datesInRange(from, to).days.length;
  const rows = monthGrid(cursor.jy, cursor.jm);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (event.target.closest('[data-range-picker]')) return;
      setOpen(false);
      setAnchor(null);
      setHover(null);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const reveal = () => {
    setCursor({ jy: start.jy, jm: start.jm });
    setAnchor(null);
    setHover(null);
    setOpen((value) => !value);
    onOpen?.();
  };

  const pick = (date) => {
    if (!anchor) {
      setAnchor(date);
      setHover(date);
      return;
    }
    const [nextStart, nextEnd] = cmpDate(anchor, date) <= 0 ? [anchor, date] : [date, anchor];
    onChange(nextStart, nextEnd);
    setAnchor(null);
    setHover(null);
    setOpen(false);
  };

  const applyPreset = (kind) => {
    const now = todayJalali();
    if (kind === 'week') {
      const weekStart = startOfPersianWeek(now.jy, now.jm, now.jd);
      onChange(weekStart, addDays(weekStart.jy, weekStart.jm, weekStart.jd, 6));
      setCursor({ jy: weekStart.jy, jm: weekStart.jm });
    } else if (kind === 'fortnight') {
      onChange(now, addDays(now.jy, now.jm, now.jd, 13));
      setCursor({ jy: now.jy, jm: now.jm });
    } else {
      onChange(
        { jy: now.jy, jm: now.jm, jd: 1 },
        { jy: now.jy, jm: now.jm, jd: jalaaliMonthLength(now.jy, now.jm) },
      );
      setCursor({ jy: now.jy, jm: now.jm });
    }
    setAnchor(null);
    setHover(null);
  };

  const shift = (delta) => {
    const next = addMonths(cursor.jy, cursor.jm, 1, delta);
    setCursor({ jy: next.jy, jm: next.jm });
  };

  return (
    <div className={`relative min-w-0 ${open ? 'z-40' : ''}`} data-plan-popover data-range-picker>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={reveal}
        className={`w-full h-11 px-3 rounded-2xl bg-white border border-[#E5EEE9] flex items-center gap-2 text-sm font-bold text-[#17352C] shadow-sm ${FOCUS}`}
      >
        <CalendarDays size={16} className="shrink-0" color={PANEL.green} />
        <span className="truncate flex-1 text-right">{rangeLabel(start, end)}</span>
        <span className="shrink-0 rounded-full bg-[#E6F6EC] text-[#0F6A49] text-[11px] font-extrabold px-2 py-0.5">
          {faNum(datesInRange(start, end).days.length)} روز
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="انتخاب بازه"
          className="absolute z-40 mt-2 w-[min(100%,22rem)] rounded-[24px] bg-white border border-[#E5EEE9] shadow-[0_18px_40px_rgba(18,70,45,0.14)] p-3"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              type="button"
              aria-label="ماه بعد"
              onClick={() => shift(1)}
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-[#0F6A49] ${FOCUS}`}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-extrabold text-[#17352C]">
              {JALALI_MONTHS[cursor.jm - 1]} {faNum(cursor.jy)}
            </p>
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => shift(-1)}
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-[#0F6A49] ${FOCUS}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_SHORT.map((label) => (
              <span key={label} className="text-[10px] font-bold text-[#7C8B85] py-1">{label}</span>
            ))}
            {rows.flat().map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const inside = cmpDate(date, from) >= 0 && cmpDate(date, to) <= 0;
              const edge = isSameJalali(date, from) || isSameJalali(date, to);
              const single = isSameJalali(from, to);
              const cap = !inside
                ? ''
                : single
                  ? 'rounded-full'
                  : isSameJalali(date, from)
                    ? 'rounded-s-full'
                    : isSameJalali(date, to)
                      ? 'rounded-e-full'
                      : '';
              const isToday = isSameJalali(date, today);
              return (
                <div key={`${date.jy}-${date.jm}-${date.jd}`} className={`h-10 flex items-center ${inside ? 'bg-[#DDF3E6]' : ''} ${cap}`}>
                  <button
                    type="button"
                    aria-pressed={edge}
                    aria-label={`${faNum(date.jd)} ${JALALI_MONTHS[date.jm - 1]}`}
                    onMouseEnter={() => anchor && setHover(date)}
                    onClick={() => pick(date)}
                    className={`mx-auto w-9 h-9 rounded-full text-sm font-bold ${FOCUS} ${
                      edge ? 'bg-[#0F6A49] text-white' : 'text-[#17352C]'
                    } ${isToday && !edge ? 'ring-1 ring-[#0F6A49]' : ''}`}
                  >
                    {faNum(date.jd)}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] font-bold text-[#0F6A49]">
            {anchor ? 'روز پایان را انتخاب کنید' : `${rangeLabel(from, to)} · ${faNum(count)} روز`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ['week', 'این هفته'],
              ['fortnight', '۱۴ روز'],
              ['month', 'این ماه'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={`h-8 px-2.5 rounded-full bg-[#F3F6F4] text-[11px] font-bold text-[#0F6A49] ${FOCUS}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
