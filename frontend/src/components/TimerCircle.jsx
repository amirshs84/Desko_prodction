import { useState, useEffect } from 'react';

/**
 * TimerCircle — دایره تایمر
 *
 * طراحی هماهنگ با LaunchButton (سبز اسیدی، SVG):
 *  ① حلقه مرز خارجی
 *  ② دو قوس چرخان — یکی آهسته CW، یکی سریع CCW
 *  ③ بدنه شیشه‌ای تیره
 *  ④ حلقه داخلی دکوراتیو
 *  ⑤ متن تایمر (HTML centered)
 *  ⑥ موج قطره‌ای هر ۴ ثانیه (3 حلقه با تأخیر پشت‌سرهم)
 */

const BASE = 320;
const BC   = BASE / 2;   // مرکز = 160

const R_ARC   = 148;     // شعاع حلقه اصلی
const R_BODY  = 131;     // بدنه
const R_INNER = 113;     // حلقه داخلی

// پالت رنگ (همان LaunchButton)
const L4 = '#a3e635';  // lime-400
const L5 = '#84cc16';  // lime-500
const L6 = '#65a30d';  // lime-600
const L7 = '#4d7c0f';  // lime-700

/* ── موج قطره‌ای ─────────────────────────────────────── */
function RippleRing({ delay }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `1px solid ${L6}`,
        pointerEvents: 'none',
        animation: 'tcRipple 3.5s cubic-bezier(0.2, 0, 0.6, 1) forwards',
      }}
    />
  );
}

/* ── کامپوننت اصلی ───────────────────────────────────── */
export default function TimerCircle({ timeText, isPaused, size = BASE }) {
  const [rippleId, setRippleId] = useState(0);

  // اولین موج بلافاصله با شروع، بعد هر ۴ ثانیه
  useEffect(() => {
    if (isPaused) return;
    setRippleId(k => k + 1);
    const iv = setInterval(() => setRippleId(k => k + 1), 4000);
    return () => clearInterval(iv);
  }, [isPaused]);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        opacity: isPaused ? 0.5 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* ⑥ موج‌های قطره‌ای — 3 حلقه با تأخیر 0، 380، 760ms */}
      {!isPaused && [0, 700, 1400].map((delay, i) => (
        <RippleRing key={`${rippleId}-${i}`} delay={delay} />
      ))}

      {/* ══ SVG دایره ══ */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${BASE} ${BASE}`}
        style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <filter id="tc-gs" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="tc-gl" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <radialGradient id="tc-body" cx="38%" cy="30%" r="68%">
            <stop offset="0%"   stopColor="#1a2e05" stopOpacity="0.5"  />
            <stop offset="50%"  stopColor="#080c02" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.96" />
          </radialGradient>
          <radialGradient id="tc-shim" cx="30%" cy="24%" r="40%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"     />
          </radialGradient>
        </defs>

        {/* ① Ambient glow */}
        <circle cx={BC} cy={BC} r={R_ARC + 22}
          fill="none" stroke={L7} strokeWidth="38" opacity="0.08" />

        {/* ① حلقه مرز بیرونی */}
        <circle cx={BC} cy={BC} r={R_ARC + 3}
          fill="none" stroke={L7} strokeWidth="2.5" opacity="0.42"
          filter="url(#tc-gs)" />
        <circle cx={BC} cy={BC} r={R_ARC}
          fill="none" stroke={L6} strokeWidth="1.2" opacity="0.48" />

        {/* ③ بدنه */}
        <circle cx={BC} cy={BC} r={R_BODY} fill="url(#tc-body)" />
        <circle cx={BC} cy={BC} r={R_BODY} fill="url(#tc-shim)" />
        <circle cx={BC} cy={BC} r={R_BODY}
          fill="none" stroke={L7} strokeWidth="1" opacity="0.32" />

        {/* ④ حلقه داخلی دکوراتیو */}
        <circle cx={BC} cy={BC} r={R_INNER}
          fill="none" stroke={L6} strokeWidth="0.6"
          strokeDasharray="5 12" opacity="0.2" />
      </svg>

      {/* ⑤ متن تایمر — HTML روی SVG */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <span
          style={{
            // فرمت کمتر از ۱ ساعت: "MM:SS" (5 کاراکتر) → 3.8rem
            // فرمت بیشتر از ۱ ساعت: "H:MM:SS" یا "HH:MM:SS" → کوچک‌تر
            fontSize: timeText.length <= 5 ? '3.8rem' : timeText.length <= 7 ? '3rem' : '2.5rem',
            fontWeight: '700',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#f0fdf4',
            letterSpacing: '0.02em',
            textShadow: `0 0 24px ${L4}50, 0 0 8px ${L4}30`,
            userSelect: 'none',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {timeText}
        </span>

        {isPaused && (
          <span
            style={{
              fontSize: '0.72rem',
              color: L5,
              letterSpacing: '0.15em',
              opacity: 0.75,
              userSelect: 'none',
            }}
          >
            متوقف
          </span>
        )}
      </div>
    </div>
  );
}
