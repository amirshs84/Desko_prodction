import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { MOCK_EXAM, STATUS_META, type SubjectResult } from '../lib/examData'
import { toFaDigits } from '../lib/persianDigits'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fa(n: number | string) {
  return toFaDigits(String(n))
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart() {
  const data = MOCK_EXAM.scoreHistory
  const W = 560
  const H = 190
  const pad = { t: 28, b: 36, l: 36, r: 20 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const min = 50
  const max = 100

  const xs = (i: number) => pad.l + (i / (data.length - 1)) * cw
  const ys = (v: number) => pad.t + ch - ((v - min) / (max - min)) * ch
  const pts = data.map((d, i) => ({ x: xs(i), y: ys(d.score), score: d.score }))

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cpx = ((prev.x + p.x) / 2).toFixed(1)
    return acc + ` C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }, '')

  const fillPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(1)} ${(H - pad.b).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - pad.b).toFixed(1)} Z`

  const gridVals = [60, 70, 80, 90, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        <linearGradient id="lgFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <filter id="lgGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={pad.l}
            y1={ys(v)}
            x2={W - pad.r}
            y2={ys(v)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={pad.l - 6}
            y={ys(v) + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.28)"
            fontSize="10"
            fontFamily="system-ui"
          >
            {fa(v)}
          </text>
        </g>
      ))}

      {/* Fill */}
      <path d={fillPath} fill="url(#lgFill)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#34d399"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lgGlow)"
      />

      {/* Dots + score labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="6"
            fill="#0d1117"
            stroke="#34d399"
            strokeWidth="2.5"
            filter="url(#dotGlow)"
          />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="700"
            fontFamily="system-ui"
          >
            {fa(p.score)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={xs(i)}
          y={H - 6}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="11"
          fontFamily="system-ui"
        >
          {d.label}
        </text>
      ))}
    </svg>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart() {
  const subjects = MOCK_EXAM.subjects

  return (
    <div className="flex flex-col gap-3.5" dir="rtl">
      {subjects.map((s) => (
        <div
          key={s.name}
          className="grid min-h-[32px] items-center gap-3"
          style={{ gridTemplateColumns: 'minmax(3.5rem, 4.5rem) minmax(0, 1fr) minmax(2.75rem, auto)' }}
        >
          <span
            className="overflow-visible text-right text-xs font-medium leading-5"
            style={{ color: 'rgba(255,255,255,0.78)' }}
          >
            {s.name}
          </span>

          <div
            className="relative h-5 self-center overflow-hidden rounded-md"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="absolute inset-y-0 rounded-md"
              style={{
                width: `${s.score}%`,
                right: 0,
                background: `linear-gradient(to left, ${s.color}66, ${s.color})`,
                boxShadow: `0 0 12px ${s.glow}`,
              }}
            />
          </div>

          <span
            className="shrink-0 overflow-visible text-left text-xs font-bold tabular-nums leading-5"
            style={{ color: '#fff' }}
          >
            {fa(s.score)}٪
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart() {
  const skills = MOCK_EXAM.skills
  const CX = 155
  const CY = 155
  const R = 105
  const N = skills.length
  const SIZE = 310

  const angles = skills.map((_, i) => (i / N) * 2 * Math.PI - Math.PI / 2)

  const pt = (angle: number, r: number) => ({
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  })

  const poly = (r: number) =>
    angles
      .map((a) => pt(a, r))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')

  const dataPts = skills.map((s, i) => pt(angles[i], (s.value / 100) * R))
  const dataPolyStr = dataPts
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const rings = [0.25, 0.5, 0.75, 1.0]

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[260px] mx-auto" aria-hidden>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.08" />
        </radialGradient>
        <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dotGlowR" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ring backgrounds */}
      {rings.map((r, i) => (
        <polygon
          key={i}
          points={poly(r * R)}
          fill={i === rings.length - 1 ? 'rgba(255,255,255,0.02)' : 'none'}
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const outer = pt(a, R)
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={outer.x.toFixed(1)}
            y2={outer.y.toFixed(1)}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolyStr}
        fill="url(#radarFill)"
        stroke="#34d399"
        strokeWidth="2.5"
        filter="url(#radarGlow)"
      />

      {/* Data dots */}
      {dataPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r="5"
          fill="#34d399"
          filter="url(#dotGlowR)"
        />
      ))}

      {/* Labels */}
      {skills.map((s, i) => {
        const labelPt = pt(angles[i], R + 26)
        const isLeft = labelPt.x < CX - 5
        const anchor = isLeft ? 'end' : labelPt.x > CX + 5 ? 'start' : 'middle'
        return (
          <g key={i}>
            <text
              x={labelPt.x.toFixed(1)}
              y={(labelPt.y - 5).toFixed(1)}
              textAnchor={anchor}
              fill="rgba(255,255,255,0.65)"
              fontSize="11"
              fontFamily="system-ui"
            >
              {s.name}
            </text>
            <text
              x={labelPt.x.toFixed(1)}
              y={(labelPt.y + 9).toFixed(1)}
              textAnchor={anchor}
              fill="#34d399"
              fontSize="10"
              fontWeight="700"
              fontFamily="system-ui"
            >
              {fa(s.value)}٪
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Circular Score Ring ──────────────────────────────────────────────────────

function ScoreRing({ score, max }: { score: number; max: number }) {
  const size = 130
  const sw = 10
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const pct = score / max
  const offset = circ - pct * circ

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        {/* Shadow ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(52,211,153,0.08)"
          strokeWidth={sw + 4}
        />
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1a2332"
          strokeWidth={sw}
        />
        {/* Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#34d399"
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.8))',
            transition: 'stroke-dashoffset 1s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-black leading-none text-white">{fa(score)}</span>
        <span className="text-xs leading-none" style={{ color: 'rgba(255,255,255,0.4)' }}>
          از {fa(max)}
        </span>
      </div>
    </div>
  )
}

// ─── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({ subj }: { subj: SubjectResult }) {
  const [animate, setAnimate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimate(true) },
      { threshold: 0.3 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const isPos = subj.delta >= 0

  return (
    <div
      ref={ref}
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{
        background: 'rgba(17,24,39,0.9)',
        border: `1px solid ${subj.color}28`,
        boxShadow: animate ? `0 0 20px ${subj.glow}` : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: `${subj.color}18`, color: subj.color }}
          >
            {subj.icon}
          </div>
          <span className="font-bold text-white text-sm">{subj.name}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{
            background: isPos ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
            color: isPos ? '#34d399' : '#f87171',
          }}
        >
          {isPos ? '+' : ''}{fa(subj.delta)}٪
        </span>
      </div>

      {/* Score + progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {fa(subj.correct)} از {fa(subj.total)} صحیح
          </span>
          <span className="text-base font-black" style={{ color: subj.color }}>
            {fa(subj.score)}٪
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: animate ? `${subj.score}%` : '0%',
              background: subj.color,
              boxShadow: `0 0 8px ${subj.glow}`,
            }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div
        className="flex justify-between text-xs pt-1 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
      >
        <span>⏱ {fa(subj.time)} دقیقه</span>
        <span style={{ color: '#f87171' }}>✗ {fa(subj.wrong)} غلط</span>
        <span style={{ color: '#34d399' }}>✓ {fa(subj.correct)} صحیح</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamResults() {
  const navigate = useNavigate()
  const exam = MOCK_EXAM
  const status = STATUS_META[exam.status]
  const progress = exam.score - exam.previousScore
  const progressPos = progress >= 0

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) navigate('/login')
  }, [navigate])

  return (
    <div className="flex h-full flex-col bg-black text-white" dir="rtl">
    <div
      className="flex-1 overflow-y-auto overscroll-none pb-nav-safe"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          to="/courses"
          className="flex items-center justify-center rounded-xl h-9 w-9 shrink-0 transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7 4l4 4-4 4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-black text-base text-white leading-tight truncate">{exam.title}</h1>
          <p className="text-xs mt-0.5 leading-none" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {exam.subtitle}
          </p>
        </div>

        <div
          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{
            background: status.bg,
            border: `1px solid ${status.border}`,
            color: status.color,
          }}
        >
          {status.label}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-10 flex flex-col gap-5 max-w-2xl mx-auto">

        {/* Meta row */}
        <div className="flex items-center gap-2 pt-4 flex-wrap">
          {[
            { icon: '📅', text: exam.date },
            { icon: '⏱', text: exam.duration },
            { icon: '🏆', text: `رتبه ${fa(exam.rank)} از ${fa(exam.totalParticipants)}` },
          ].map((m) => (
            <span
              key={m.text}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              <span>{m.icon}</span>
              {m.text}
            </span>
          ))}
        </div>

        {/* ── Score Hero ────────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(10,17,28,1) 100%)',
            border: '1px solid rgba(52,211,153,0.2)',
            boxShadow: '0 0 40px rgba(52,211,153,0.08)',
          }}
        >
          {/* Glow blob */}
          <div
            className="absolute -top-12 -right-12 rounded-full pointer-events-none"
            style={{
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
            }}
          />

          <div className="flex items-center gap-5 relative z-10">
            <ScoreRing score={exam.score} max={exam.maxScore} />

            <div className="flex-1 grid grid-cols-2 gap-3">
              {/* Progress */}
              <div
                className="rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>پیشرفت</span>
                <span
                  className="text-xl font-black"
                  style={{ color: progressPos ? '#34d399' : '#f87171' }}
                >
                  {progressPos ? '+' : ''}{fa(progress)}٪
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  نسبت به قبل
                </span>
              </div>

              {/* Avg */}
              <div
                className="rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>میانگین</span>
                <span className="text-xl font-black text-white">{fa(exam.average)}</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  میانگین دروس
                </span>
              </div>

              {/* Best */}
              <div
                className="rounded-2xl p-3 flex flex-col gap-1"
                style={{
                  background: 'rgba(52,211,153,0.07)',
                  border: '1px solid rgba(52,211,153,0.18)',
                }}
              >
                <span className="text-xs" style={{ color: 'rgba(52,211,153,0.7)' }}>بهترین درس</span>
                <span className="text-base font-black" style={{ color: '#34d399' }}>
                  {exam.bestSubject}
                </span>
              </div>

              {/* Weakest */}
              <div
                className="rounded-2xl p-3 flex flex-col gap-1"
                style={{
                  background: 'rgba(248,113,113,0.07)',
                  border: '1px solid rgba(248,113,113,0.18)',
                }}
              >
                <span className="text-xs" style={{ color: 'rgba(248,113,113,0.7)' }}>نیاز به تمرین</span>
                <span className="text-base font-black" style={{ color: '#f87171' }}>
                  {exam.weakestSubject}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Subject Cards ─────────────────────────────────────────────────── */}
        <section>
          <SectionTitle icon="📚" title="تحلیل دروس" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exam.subjects.map((s) => (
              <SubjectCard key={s.name} subj={s} />
            ))}
          </div>
        </section>

        {/* ── Line Chart ────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle icon="📈" title="روند نمرات" subtitle="تاریخچه ۵ آزمون گذشته" />
          <div
            className="rounded-3xl p-4"
            style={{
              background: 'rgba(17,24,39,0.9)',
              border: '1px solid rgba(52,211,153,0.12)',
            }}
          >
            <LineChart />
          </div>
        </section>

        {/* ── Bar + Radar ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Bar */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="📊" title="مقایسه دروس" />
            <div
              className="rounded-3xl p-4 flex-1"
              style={{
                background: 'rgba(17,24,39,0.9)',
                border: '1px solid rgba(96,165,250,0.12)',
              }}
            >
              <BarChart />
            </div>
          </div>

          {/* Radar */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="🕸" title="نمودار مهارت‌ها" />
            <div
              className="rounded-3xl p-4 flex-1 flex items-center justify-center"
              style={{
                background: 'rgba(17,24,39,0.9)',
                border: '1px solid rgba(167,139,250,0.12)',
              }}
            >
              <RadarChart />
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 flex flex-col items-center gap-3 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(96,165,250,0.08) 100%)',
            border: '1px solid rgba(52,211,153,0.2)',
          }}
        >
          <span className="text-3xl">🎯</span>
          <p className="font-bold text-white text-base">
            برای بهبود شیمی تمرین اضافه کن
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            با تمرین روزانه ۲۰ دقیقه می‌تونی این نمره رو به بالای ۸۰ برسونی
          </p>
          <button
            className="mt-1 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #34d399, #10b981)',
              color: '#000',
              boxShadow: '0 0 20px rgba(52,211,153,0.4)',
            }}
          >
            افزودن تمرین شیمی
          </button>
        </div>

      </div>
    </div>
    <BottomNav />
    </div>
  )
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{icon}</span>
      <div>
        <h2 className="font-black text-sm text-white leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
