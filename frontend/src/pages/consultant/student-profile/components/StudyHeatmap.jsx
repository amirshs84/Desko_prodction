import { formatSeconds } from '../../demo/components/DemoUi';
import { PROFILE } from '../profileTheme';

/** رنگ‌های هیت‌مپ سازگار با تم روشن emerald (الگوی تقویم پیشرفت دانش‌آموز). */
function heatClass(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  if (minutes <= 0) return 'bg-gray-100';
  if (minutes < 30) return 'bg-emerald-100';
  if (minutes < 60) return 'bg-emerald-300';
  if (minutes < 120) return 'bg-emerald-400';
  return 'bg-emerald-500';
}

/**
 * هیت‌مپ ۹۰ روزه به سبک GitHub: ستون = هفته، ردیف = روز هفته (شنبه→جمعه).
 * ورودی API: [{ date: 'YYYY-MM-DD', total_seconds, sessions }]
 */
export function StudyHeatmap({ days = [], onSelectDate }) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  // آخرین روز موجود یا امروز را لنگر می‌گیریم و ۹۰ روز عقب می‌رویم.
  const anchor = days.length
    ? new Date(`${days[days.length - 1].date}T12:00:00`)
    : new Date();
  const start = new Date(anchor);
  start.setDate(start.getDate() - 89);

  // شروع از شنبه برای تقویم ایرانی (JS: Sat=6)
  const pad = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - pad);

  const cells = [];
  const cursor = new Date(start);
  const end = new Date(anchor);
  // تا پایان هفته‌ی لنگر ادامه بده
  const endPad = 6 - ((end.getDay() + 1) % 7);
  end.setDate(end.getDate() + endPad);

  while (cursor <= end) {
    const key = cursor.toLocaleDateString('en-CA');
    const hit = byDate.get(key);
    const inRange = cursor >= new Date(anchor.getTime() - 89 * 86400000) && cursor <= anchor;
    cells.push({
      key,
      date: key,
      total_seconds: hit?.total_seconds || 0,
      sessions: hit?.sessions || 0,
      inRange,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const monthLabels = [];
  let lastMonth = '';
  weeks.forEach((week, weekIndex) => {
    const first = week[0];
    if (!first) return;
    const label = new Date(`${first.date}T12:00:00`).toLocaleDateString('fa-IR', {
      month: 'short',
    });
    if (label !== lastMonth) {
      monthLabels.push({ weekIndex, label });
      lastMonth = label;
    }
  });

  return (
    <div className="w-full overflow-x-auto" dir="ltr">
      <div className="inline-flex gap-2 min-w-max">
        <div
          className="flex flex-col justify-between text-[10px] py-5 pl-1 h-[148px]"
          style={{ color: PROFILE.inkSoft }}
        >
          <span>ش</span>
          <span>د</span>
          <span>چ</span>
          <span>ج</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="relative h-5 mb-0.5" style={{ width: weeks.length * 18 }}>
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={`${label}-${weekIndex}`}
                className="absolute text-[10px]"
                style={{ right: weekIndex * 18, color: PROFILE.inkSoft }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className="inline-grid gap-1"
            style={{
              gridTemplateRows: 'repeat(7, 14px)',
              gridAutoFlow: 'column',
              gridAutoColumns: '14px',
            }}
          >
            {cells.map((day) => (
              <button
                key={day.key}
                type="button"
                disabled={!day.inRange || !onSelectDate}
                onClick={() => day.inRange && onSelectDate?.(day.date)}
                title={day.inRange && onSelectDate ? 'مشاهده جزئیات این روز' : undefined}
                className={`w-3.5 h-3.5 rounded-sm relative group border-0 p-0 appearance-none disabled:opacity-100 ${
                  day.inRange ? heatClass(day.total_seconds) : 'bg-transparent'
                } ${day.inRange && onSelectDate ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' : ''}`}
              >
                {day.inRange && (
                  <div
                    className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                               z-20 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg pointer-events-none"
                    style={{
                      background: PROFILE.ink,
                      color: '#fff',
                    }}
                  >
                    <div className="font-semibold">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString('fa-IR')}
                    </div>
                    <div style={{ color: PROFILE.brandMid }}>
                      {formatSeconds(day.total_seconds)}
                    </div>
                    <div style={{ color: '#94A3B8' }}>{day.sessions} جلسه</div>
                    {onSelectDate && (
                      <div style={{ color: '#CBD5E1' }}>کلیک برای جزئیات روز</div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-2 text-[11px] mt-4"
        style={{ color: PROFILE.inkSoft }}
      >
        <span>کمتر</span>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-sm bg-gray-100" />
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-100" />
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-300" />
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-400" />
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500" />
        </div>
        <span>بیشتر</span>
      </div>
    </div>
  );
}
