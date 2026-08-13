import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  jalaaliMonthLength,
  jalaaliToDate,
  jalaliWeekDay,
  monthGrid,
  todayJalali,
} from '../../../../calendar/lib/jalaliUtils';
import { formatMonthYear, WEEKDAY_FULL } from '../../../../calendar/lib/labels';
import { toFaDigits } from '../../../../calendar/lib/persianDigits';
import { Card, EmptyState, PrimaryButton, formatSeconds } from '../../demo/components/DemoUi';
import { useStudentActualCalendar } from '../../demo/hooks/useConsultantQueries';
import { DailyReportView, formatIranTime } from '../components/DailyReportView';
import { PROFILE } from '../profileTheme';

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange(jy, jm) {
  const start = jalaaliToDate(jy, jm, 1);
  const end = jalaaliToDate(jy, jm, jalaaliMonthLength(jy, jm));
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

function shiftMonth(jy, jm, delta) {
  let y = jy;
  let m = jm + delta;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  return { jy: y, jm: m };
}

function minutesLabel(total) {
  const h = Math.floor(total / 60) % 24;
  const min = total % 60;
  return toFaDigits(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
}

export function ActualCalendarTab({ userId }) {
  const today = todayJalali();
  const [cursor, setCursor] = useState({ jy: today.jy, jm: today.jm });
  const [selectedIso, setSelectedIso] = useState(null);

  const range = useMemo(() => monthRange(cursor.jy, cursor.jm), [cursor]);
  const { data, isLoading, isError, error, refetch } = useStudentActualCalendar(userId, range);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of data?.events || []) {
      const key = `${event.jy}-${event.jm}-${event.jd}`;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [data]);

  const rows = useMemo(() => monthGrid(cursor.jy, cursor.jm), [cursor]);

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-3">
          {error?.response?.data?.error?.message || 'خطا در دریافت تقویم عملی'}
        </p>
        <PrimaryButton onClick={() => refetch()} style={{ background: PROFILE.brand }}>
          تلاش دوباره
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 pb-10 max-w-6xl mx-auto flex flex-col gap-4">
      <div
        className="rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{ background: '#0F172A', color: '#E2E8F0' }}
      >
        <div>
          <p className="text-sm font-bold text-white">تقویم عملی</p>
          <p className="text-[11px] mt-0.5 text-slate-400 leading-relaxed">
            فقط عملکرد واقعی ثبت‌شده (بازه شروع و پایان مطالعه). این نما با تقویم برنامه‌ریزی فرق دارد.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            عملی · توپر
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 rounded-sm border border-slate-400 bg-transparent" />
            برنامه · حاشیه‌دار
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c.jy, c.jm, 1))}
          className="p-2 rounded-xl hover:bg-white"
          aria-label="ماه بعد"
        >
          <ChevronRight size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold" style={{ color: PROFILE.ink }}>
            {formatMonthYear(cursor.jy, cursor.jm)}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isLoading
              ? 'در حال بارگذاری…'
              : `${data?.session_count || 0} بازه · ${formatSeconds(data?.total_seconds || 0)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c.jy, c.jm, -1))}
          className="p-2 rounded-xl hover:bg-white"
          aria-label="ماه قبل"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <Card className="!p-3 md:!p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_FULL.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-bold py-1"
              style={{ color: PROFILE.inkSoft }}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {row.map((cell, ci) => {
                if (!cell) {
                  return <div key={ci} className="min-h-[88px] rounded-xl bg-transparent" />;
                }
                const key = `${cell.jy}-${cell.jm}-${cell.jd}`;
                const events = eventsByDay.get(key) || [];
                const iso = toIsoDate(jalaaliToDate(cell.jy, cell.jm, cell.jd));
                const isToday =
                  cell.jy === today.jy && cell.jm === today.jm && cell.jd === today.jd;
                const isSelected = selectedIso === iso;
                const isFriday = jalaliWeekDay(cell.jy, cell.jm, cell.jd) === 6;
                return (
                  <button
                    key={ci}
                    type="button"
                    onClick={() => setSelectedIso(iso)}
                    className="min-h-[88px] rounded-xl p-1.5 text-right flex flex-col gap-1 transition-shadow"
                    style={{
                      background: isSelected ? PROFILE.brandSoft : '#fff',
                      border: isSelected
                        ? `2px solid ${PROFILE.brand}`
                        : isToday
                          ? `1px solid ${PROFILE.brandMid}`
                          : '1px solid #E2E8F0',
                      boxShadow: events.length
                        ? 'inset 0 0 0 1px rgba(5,150,105,0.08)'
                        : 'none',
                    }}
                  >
                    <span
                      className="text-xs font-bold self-end"
                      style={{ color: isFriday ? '#DC2626' : PROFILE.ink }}
                    >
                      {toFaDigits(cell.jd)}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
                      {events.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="block truncate rounded-md px-1 py-0.5 text-[10px] font-bold text-white leading-tight"
                          style={{ background: event.color || PROFILE.brand }}
                          title={`${event.title} ${minutesLabel(event.start_minutes)}`}
                        >
                          {minutesLabel(event.start_minutes)} {event.title}
                        </span>
                      ))}
                      {events.length > 3 && (
                        <span className="text-[9px] text-gray-400">
                          +{toFaDigits(events.length - 3)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {selectedIso ? (
        <DailyReportView
          userId={userId}
          date={selectedIso}
          onBack={() => setSelectedIso(null)}
          backLabel="بستن جزئیات روز"
        />
      ) : (
        <MonthSummary events={data?.events || []} isLoading={isLoading} />
      )}
    </div>
  );
}

function MonthSummary({ events, isLoading }) {
  if (isLoading) return <EmptyState message="در حال بارگذاری جلسات…" />;
  if (!events.length) {
    return (
      <Card>
        <p className="text-sm text-gray-400">
          در این ماه بازه مطالعاتی ثبت نشده است.
        </p>
      </Card>
    );
  }
  const recent = [...events].slice(-8).reverse();
  return (
    <Card>
      <h3 className="font-bold text-sm mb-3">آخرین بازه‌های این ماه</h3>
      <ul className="divide-y divide-gray-50">
        {recent.map((event) => (
          <li key={event.id} className="py-2.5 flex items-center gap-3 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: event.color }}
            />
            <span className="flex-1 truncate font-medium">{event.title}</span>
            <span className="text-xs text-gray-400 shrink-0">
              {formatIranTime(event.start_time)} – {formatIranTime(event.end_time)}
            </span>
            <span className="text-xs text-gray-500 shrink-0">
              {formatSeconds(event.duration_seconds)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
