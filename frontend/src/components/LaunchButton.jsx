import { useState } from 'react';

/**
 * LaunchButton — دکمه شروع
 *
 * لایه‌ها:
 *  ① حلقه تعریف‌کننده مرز (border خارجی)
 *  ② هاله نور چرخان با قوس رشدکننده/کوچک‌شونده (مثل باز کردن ویس)
 *  ③ بدنه شیشه‌ای تیره
 *  ④ حلقه دکوراتیو داخلی
 *  ⑤ آیکون اتم با الکترون‌های متحرک + هسته پالس‌دار
 *  ⑥ burst ring هنگام کلیک
 */

const S    = 208;
const C    = S / 2;          // مرکز = 104

const R_HALO  = 97;          // شعاع هاله چرخان
const R_BODY  = 83;          // شعاع بدنه
const R_INNER = 71;          // حلقه داخلی

// دایره‌محیط هاله
const CIRC = 2 * Math.PI * R_HALO;  // ≈ 609.7

// مقادیر انیمیشن رشد/کوچک‌شدن قوس:
//   شروع: نقطه (ARC_MIN=1)  →  اوج: ۷۸٪ دایره  →  برگشت به نقطه
const ARC_MIN = 1;
const ARC_MAX = CIRC * 0.78;
const DASH_VALS = [
  `${ARC_MIN.toFixed(1)} ${(CIRC - ARC_MIN).toFixed(1)}`,
  `${ARC_MAX.toFixed(1)} ${(CIRC - ARC_MAX).toFixed(1)}`,
  `${ARC_MIN.toFixed(1)} ${(CIRC - ARC_MIN).toFixed(1)}`,
].join('; ');

// مقادیر انیمیشن پر شدن کامل قوس هنگام launch
const FILL_VALS = `1 ${(CIRC - 1).toFixed(1)}; ${CIRC.toFixed(1)} 0`;

// هندسه اتم
const ORX = 27;
const ORY = 10.5;
const ELLIPSE_CW  = `M ${ORX},0 A ${ORX},${ORY} 0 0,1 ${-ORX},0 A ${ORX},${ORY} 0 0,1 ${ORX},0`;
const ELLIPSE_CCW = `M ${ORX},0 A ${ORX},${ORY} 0 0,0 ${-ORX},0 A ${ORX},${ORY} 0 0,0 ${ORX},0`;

// ── پالت رنگ سبز اسیدی ──────────────────────────────────────────────────────
const LIME_4 = '#a3e635';   // lime-400  — روشن‌ترین (هاله تیز، الکترون‌ها)
const LIME_5 = '#84cc16';   // lime-500  — اصلی
const LIME_6 = '#65a30d';   // lime-600  — برای حلقه‌های مدار
const LIME_7 = '#4d7c0f';   // lime-700  — تاریک‌تر (حلقه خارجی، blur glow)
const LIME_2 = '#d9f99d';   // lime-200  — هایلایت الکترون‌ها
const LIME_0 = '#ecfccb';   // lime-50   — هسته مرکزی

export default function LaunchButton({ size = S, onClick, isHovered, isLaunching = false }) {
  const [burstId, setBurstId] = useState(null);

  const handleClick = () => {
    const id = Date.now();
    setBurstId(id);
    setTimeout(() => setBurstId(null), 750);
    onClick?.();
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: 'pointer',
        transform: isLaunching ? 'scale(1.12)' : isHovered ? 'scale(1.07)' : 'scale(1)',
        transition: isLaunching
          ? 'transform 0.3s ease-out'
          : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={handleClick}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${S} ${S}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* glow ملایم */}
          <filter id="lb-gs" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* glow قوی */}
          <filter id="lb-gl" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* gradient بدنه — زمینه اسیدی بسیار تیره */}
          <radialGradient id="lb-body-g" cx="38%" cy="30%" r="68%">
            <stop offset="0%"   stopColor="#1a2e05" stopOpacity="0.55" />
            <stop offset="50%"  stopColor="#080c02" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
          </radialGradient>

          {/* shimmer ظریف */}
          <radialGradient id="lb-shim" cx="32%" cy="25%" r="45%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"     />
          </radialGradient>
        </defs>

        {/* ① Ambient glow بیرونی (کاملاً ثابت) */}
        <circle cx={C} cy={C} r={R_HALO + 18}
          fill="none" stroke={LIME_7} strokeWidth="28" opacity="0.07" />

        {/* ① حلقه مرز خارجی — به‌اندازه کافی مشخص ولی نه زننده */}
        {/* لایه بیرونی‌تر: هاله تاریک */}
        <circle cx={C} cy={C} r={R_HALO + 3}
          fill="none" stroke={LIME_7} strokeWidth="2.5" opacity="0.45"
          filter="url(#lb-gs)" />
        {/* لایه اصلی مرز */}
        <circle cx={C} cy={C} r={R_HALO}
          fill="none" stroke={LIME_6} strokeWidth="1.2" opacity="0.5" />

        {/* ② هاله چرخان — لایه blur (قوس رشد/کوچک‌شونده) */}
        <circle
          cx={C} cy={C} r={R_HALO}
          fill="none"
          stroke={LIME_5}
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.38"
          filter="url(#lb-gl)"
        >
          {/* قوس از نقطه رشد می‌کنه تا ۷۸٪ دایره، بعد برمی‌گرده */}
          <animate
            attributeName="stroke-dasharray"
            values={DASH_VALS}
            keyTimes="0; 0.5; 1"
            keySplines="0.25 0.1 0.25 1; 0.42 0 1 1"
            calcMode="spline"
            dur="4.2s"
            repeatCount="indefinite"
          />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${C} ${C}`} to={`360 ${C} ${C}`}
            dur="3.6s" repeatCount="indefinite" />
        </circle>

        {/* ② هاله چرخان — لایه تیز (همان انیمیشن sync) */}
        <circle
          cx={C} cy={C} r={R_HALO}
          fill="none"
          stroke={LIME_4}
          strokeWidth="2.3"
          strokeLinecap="round"
          opacity="0.92"
          filter="url(#lb-gs)"
        >
          <animate
            attributeName="stroke-dasharray"
            values={DASH_VALS}
            keyTimes="0; 0.5; 1"
            keySplines="0.25 0.1 0.25 1; 0.42 0 1 1"
            calcMode="spline"
            dur="4.2s"
            repeatCount="indefinite"
          />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${C} ${C}`} to={`360 ${C} ${C}`}
            dur="3.6s" repeatCount="indefinite" />
        </circle>

        {/* ③ بدنه دکمه */}
        <circle cx={C} cy={C} r={R_BODY} fill="url(#lb-body-g)" />
        <circle cx={C} cy={C} r={R_BODY} fill="url(#lb-shim)" />
        <circle cx={C} cy={C} r={R_BODY}
          fill="none" stroke={LIME_7} strokeWidth="0.8" opacity="0.35" />

        {/* ④ حلقه دکوراتیو داخلی (dashed) */}
        <circle cx={C} cy={C} r={R_INNER}
          fill="none" stroke={LIME_6} strokeWidth="0.5"
          strokeDasharray="3 7" opacity="0.18" />

        {/* ══ ⑤ آیکون اتم ═══════════════════════════════════════════════ */}

        {/* مدار ۱ — کج ۲۰° */}
        <ellipse cx={C} cy={C} rx={ORX} ry={ORY}
          fill="none" stroke={LIME_6} strokeWidth="0.7" opacity="0.5"
          transform={`rotate(20 ${C} ${C})`} />

        {/* الکترون ۱ (CW) */}
        <g transform={`translate(${C} ${C}) rotate(20)`}>
          <circle r="3.2" fill={LIME_4} filter="url(#lb-gs)">
            <animateMotion dur="2.5s" repeatCount="indefinite" path={ELLIPSE_CW} />
          </circle>
          {/* دنباله */}
          <circle r="1.8" fill={LIME_2} opacity="0.5">
            <animateMotion dur="2.5s" repeatCount="indefinite"
              path={ELLIPSE_CW} keyPoints="0.04;1.04" keyTimes="0;1" calcMode="linear" />
          </circle>
        </g>

        {/* مدار ۲ — کج ۸۰° */}
        <ellipse cx={C} cy={C} rx={ORX} ry={ORY}
          fill="none" stroke={LIME_6} strokeWidth="0.7" opacity="0.5"
          transform={`rotate(80 ${C} ${C})`} />

        {/* الکترون ۲ (CCW، سرعت متفاوت) */}
        <g transform={`translate(${C} ${C}) rotate(80)`}>
          <circle r="3.2" fill={LIME_2} filter="url(#lb-gs)">
            <animateMotion dur="3.6s" repeatCount="indefinite" path={ELLIPSE_CCW} />
          </circle>
          <circle r="1.8" fill={LIME_0} opacity="0.5">
            <animateMotion dur="3.6s" repeatCount="indefinite"
              path={ELLIPSE_CCW} keyPoints="0.04;1.04" keyTimes="0;1" calcMode="linear" />
          </circle>
        </g>

        {/* هسته */}
        <circle cx={C} cy={C} r="7"   fill={LIME_5} opacity="0.55" filter="url(#lb-gl)" />
        <circle cx={C} cy={C} r="4.5" fill={LIME_4} filter="url(#lb-gs)" />
        <circle cx={C} cy={C} r="2.5" fill={LIME_0} />

        {/* پالس هسته */}
        <circle cx={C} cy={C} r="5" fill="none" stroke={LIME_4} strokeWidth="1.2" opacity="0">
          <animate attributeName="r"       values="5;15;5"     dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.65;0;0.65" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* ⑥-a انیمیشن پر شدن قوس هنگام launch — روی همه لایه‌های قبلی */}
        {isLaunching && (
          <>
            {/* لایه blur پر شدن */}
            <circle cx={C} cy={C} r={R_HALO}
              fill="none" stroke={LIME_5}
              strokeWidth="10" strokeLinecap="round"
              filter="url(#lb-gl)" opacity="0.4"
            >
              <animate attributeName="stroke-dasharray"
                values={FILL_VALS} dur="0.52s" fill="freeze" />
            </circle>

            {/* لایه تیز پر شدن */}
            <circle cx={C} cy={C} r={R_HALO}
              fill="none" stroke={LIME_4}
              strokeWidth="2.5" strokeLinecap="round"
              filter="url(#lb-gs)" opacity="1"
            >
              <animate attributeName="stroke-dasharray"
                values={FILL_VALS} dur="0.52s" fill="freeze" />
            </circle>

            {/* حلقه فلاش منبسط‌شونده */}
            <circle cx={C} cy={C} r={R_HALO}
              fill="none" stroke={LIME_2}
              strokeWidth="2" filter="url(#lb-gl)"
            >
              <animate attributeName="r"
                values={`${R_HALO};${R_HALO + 28}`} dur="0.62s" fill="freeze" />
              <animate attributeName="opacity"
                values="0.85;0" dur="0.62s" fill="freeze" />
            </circle>
          </>
        )}

        {/* ⑥-b Burst ring هنگام کلیک */}
        {burstId && (
          <circle key={burstId} cx={C} cy={C}
            fill="none" stroke={LIME_4} strokeWidth="2.5"
            filter="url(#lb-gs)" r="16" opacity="0.9">
            <animate attributeName="r"            values="16;107"   dur="0.65s" fill="freeze" />
            <animate attributeName="opacity"       values="0.9;0"    dur="0.65s" fill="freeze" />
            <animate attributeName="stroke-width"  values="2.5;0.3"  dur="0.65s" fill="freeze" />
          </circle>
        )}

      </svg>
    </div>
  );
}
