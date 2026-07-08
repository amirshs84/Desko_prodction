import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Sector, ResponsiveContainer } from 'recharts';

/* ───── Active Shape با گلو ───── */
const ActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const glowId = `donut-glow-${fill.replace(/[^a-zA-Z0-9]/g, '')}`;
  const haloId = `donut-halo-${fill.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <g>
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={haloId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        </filter>
      </defs>

      {/* هاله بیرونی */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 18}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        filter={`url(#${haloId})`}
        opacity={0.35}
      />

      {/* سگمنت اصلی با گلو */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        filter={`url(#${glowId})`}
      />
    </g>
  );
};

/* ───── Tooltip سفارشی ───── */
const CustomTooltip = ({ active, payload, formatDuration }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(10, 10, 22, 0.95)',
      backdropFilter: 'blur(24px)',
      border: `1px solid ${d.color}40`,
      borderRadius: '14px',
      padding: '12px 16px',
      boxShadow: `0 0 24px ${d.color}30, 0 12px 40px rgba(0,0,0,0.6)`,
      minWidth: '150px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          backgroundColor: d.color,
          boxShadow: `0 0 10px ${d.color}`,
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13, direction: 'rtl' }}>
          {d.subject}
        </span>
      </div>
      <div style={{ color: d.color, fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
        {formatDuration(d.duration)}
      </div>
      <div style={{ color: '#64748b', fontSize: 12 }}>{d.percentage}٪ از کل</div>
    </div>
  );
};

/* ───── کامپوننت اصلی ───── */
export default function SubjectDonutChart({
  subjectData,
  getSubjectColor,
  formatDuration,
  totalSeconds,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const sorted = [...subjectData]
    .sort((a, b) => b.duration - a.duration)
    .map((item) => ({ ...item, color: getSubjectColor(item.subject) }));

  const topSubject = sorted[0];

  const onEnter = useCallback((_, index) => setActiveIndex(index), []);
  const onLeave = useCallback(() => setActiveIndex(null), []);

  if (sorted.length === 0) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-edge flex flex-col"
      style={{
        background:
          'linear-gradient(145deg, rgba(13,13,28,0.96) 0%, rgba(18,18,38,0.92) 100%)',
        boxShadow:
          '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* لایه گرادیان محیطی */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 25% 15%, rgba(59,130,246,0.12) 0%, transparent 55%), ' +
            'radial-gradient(ellipse at 75% 85%, rgba(139,92,246,0.1) 0%, transparent 55%)',
        }}
      />

      {/* ───── محتوا ───── */}
      <div className="relative z-10 p-5 flex flex-col flex-1">
        {/* عنوان */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-2">توزیع موضوعات</h2>
          {topSubject && (
            <div
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                color: topSubject.color,
                background: `${topSubject.color}1a`,
                border: `1px solid ${topSubject.color}30`,
              }}
            >
              {topSubject.percentage}٪ {topSubject.subject}
            </div>
          )}
        </div>

        {/* دونات چارت */}
        <div className="relative flex-shrink-0" style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                cx="50%"
                cy="50%"
                innerRadius={66}
                outerRadius={90}
                paddingAngle={2.5}
                dataKey="duration"
                animationBegin={80}
                animationDuration={1300}
                animationEasing="ease-out"
                activeIndex={activeIndex ?? -1}
                activeShape={<ActiveShape />}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                strokeWidth={0}
                stroke="none"
              >
                {sorted.map((entry, i) => (
                  <Cell
                    key={entry.subject}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                    stroke="none"
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                ))}
              </Pie>

              <Tooltip
                content={<CustomTooltip formatDuration={formatDuration} />}
                wrapperStyle={{ zIndex: 50, outline: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* متن مرکز */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ direction: 'rtl' }}
          >
            <div
              className="text-xl font-extrabold text-ink"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.12)',
                letterSpacing: '-0.5px',
              }}
            >
              {formatDuration(totalSeconds)}
            </div>
            <div className="text-[11px] text-ink-4 mt-0.5 tracking-wide">مجموع</div>
          </div>

          {/* حلقه داخلی سایه */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              style={{
                width: 132,
                height: 132,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.4)',
              }}
            />
          </div>
        </div>

        {/* لجند */}
        <div className="mt-3 space-y-1.5">
          {sorted.slice(0, 6).map((item, index) => (
            <div
              key={item.subject}
              className="flex items-center justify-between gap-3 cursor-pointer rounded-xl px-2.5 py-1.5"
              style={{
                opacity: activeIndex === null || activeIndex === index ? 1 : 0.35,
                background:
                  activeIndex === index ? `${item.color}14` : 'transparent',
                transition: 'all 0.18s ease',
                boxShadow:
                  activeIndex === index
                    ? `inset 0 0 0 1px ${item.color}25`
                    : 'none',
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {/* رنگ + نام */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: item.color,
                    boxShadow:
                      activeIndex === index ? `0 0 8px ${item.color}` : 'none',
                    transform:
                      activeIndex === index ? 'scale(1.4)' : 'scale(1)',
                    transition: 'all 0.18s ease',
                  }}
                />
                <span className="text-sm text-ink-2 truncate font-medium">
                  {item.subject}
                </span>
              </div>

              {/* مدت + درصد */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs text-ink-4">
                  {formatDuration(item.duration)}
                </span>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{
                    color: item.color,
                    minWidth: '2.2rem',
                    textAlign: 'right',
                  }}
                >
                  {item.percentage}٪
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
