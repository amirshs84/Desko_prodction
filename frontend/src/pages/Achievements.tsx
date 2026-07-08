import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from '../components/BottomNav'

// ─── Types ────────────────────────────────────────────────────────────────────

type Rarity = 'bronze' | 'silver' | 'gold' | 'legendary'
type Category = 'all' | 'streaks' | 'challenges' | 'milestones' | 'special'

interface Achievement {
  id: number
  name: string
  desc: string
  category: Exclude<Category, 'all'>
  rarity: Rarity
  icon: string
  earned: boolean
  date?: string
  progress?: number
  featured?: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    name: 'استاد کنکور',
    desc: '۱۰۰۰ ساعت مطالعه کامل شد',
    category: 'milestones',
    rarity: 'legendary',
    icon: '🏆',
    earned: true,
    date: '۱۴۰۳/۰۲/۱۵',
    featured: true,
  },
  {
    id: 2,
    name: 'آتش‌بازی',
    desc: '۳۰ روز متوالی بدون وقفه',
    category: 'streaks',
    rarity: 'gold',
    icon: '🔥',
    earned: true,
    date: '۱۴۰۳/۰۳/۰۱',
    featured: true,
  },
  {
    id: 3,
    name: 'چالش‌گر بزرگ',
    desc: '۵۰ چالش مطالعاتی تکمیل شد',
    category: 'challenges',
    rarity: 'gold',
    icon: '⚡',
    earned: true,
    date: '۱۴۰۳/۰۱/۲۰',
    featured: true,
  },
  {
    id: 4,
    name: 'محقق ریاضی',
    desc: '۲۰۰ ساعت مطالعه ریاضی',
    category: 'milestones',
    rarity: 'silver',
    icon: '📐',
    earned: true,
    date: '۱۴۰۳/۰۲/۱۰',
  },
  {
    id: 5,
    name: 'هفته‌گرد',
    desc: '۷ روز متوالی مطالعه',
    category: 'streaks',
    rarity: 'silver',
    icon: '📅',
    earned: true,
    date: '۱۴۰۳/۰۱/۰۵',
  },
  {
    id: 6,
    name: 'شروع‌کننده',
    desc: 'اولین جلسه مطالعه ثبت شد',
    category: 'milestones',
    rarity: 'bronze',
    icon: '🌱',
    earned: true,
    date: '۱۴۰۲/۱۲/۰۱',
  },
  {
    id: 7,
    name: 'افسانه المپیاد',
    desc: '۵۰۰ ساعت مطالعه المپیادی',
    category: 'special',
    rarity: 'legendary',
    icon: '💎',
    earned: false,
    progress: 65,
  },
  {
    id: 8,
    name: 'ماراتن مطالعه',
    desc: '۶۰ روز متوالی مطالعه',
    category: 'streaks',
    rarity: 'gold',
    icon: '🏃',
    earned: false,
    progress: 50,
  },
  {
    id: 9,
    name: 'کاوشگر دروس',
    desc: 'مطالعه ۱۰ درس مختلف',
    category: 'challenges',
    rarity: 'silver',
    icon: '🔬',
    earned: false,
    progress: 80,
  },
  {
    id: 10,
    name: 'شب‌زنده‌دار',
    desc: '۱۰ جلسه مطالعه شبانه',
    category: 'special',
    rarity: 'bronze',
    icon: '🌙',
    earned: false,
    progress: 30,
  },
  {
    id: 11,
    name: 'دانشمند فیزیک',
    desc: '۱۰۰ ساعت مطالعه فیزیک',
    category: 'milestones',
    rarity: 'silver',
    icon: '⚗️',
    earned: false,
    progress: 45,
  },
  {
    id: 12,
    name: 'سپیده‌دم',
    desc: '۵ بار مطالعه صبح زود',
    category: 'special',
    rarity: 'bronze',
    icon: '🌅',
    earned: false,
    progress: 60,
  },
]

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all',        label: 'همه',         emoji: '✨' },
  { id: 'streaks',    label: 'رکوردها',      emoji: '🔥' },
  { id: 'challenges', label: 'چالش‌ها',      emoji: '⚡' },
  { id: 'milestones', label: 'دستاوردها',    emoji: '🎯' },
  { id: 'special',    label: 'ویژه',         emoji: '💫' },
]

// ─── Rarity Config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<Rarity, {
  label: string
  ringColor: string
  glowColor: string
  gradientFrom: string
  gradientTo: string
  textColor: string
  bgColor: string
}> = {
  bronze: {
    label: 'برنز',
    ringColor: 'ring-amber-700/60',
    glowColor: '',
    gradientFrom: 'from-amber-800',
    gradientTo: 'to-orange-900',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-900/20',
  },
  silver: {
    label: 'نقره',
    ringColor: 'ring-slate-400/50',
    glowColor: '',
    gradientFrom: 'from-slate-500',
    gradientTo: 'to-slate-700',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-500/10',
  },
  gold: {
    label: 'طلا',
    ringColor: 'ring-yellow-400/60',
    glowColor: 'shadow-[0_0_20px_rgba(234,179,8,0.35)]',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-amber-600',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  legendary: {
    label: 'افسانه‌ای',
    ringColor: 'ring-purple-400/70',
    glowColor: 'shadow-[0_0_30px_rgba(168,85,247,0.45)]',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-indigo-700',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-500/10',
  },
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ value, size = 80, strokeWidth = 6, color = '#a78bfa' }: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

// ─── Badge Icon ───────────────────────────────────────────────────────────────

function BadgeIcon({ achievement, size = 56 }: { achievement: Achievement; size?: number }) {
  const cfg = RARITY_CONFIG[achievement.rarity]

  if (!achievement.earned) {
    return (
      <div
        className="relative flex items-center justify-center rounded-2xl bg-slate-800/60 ring-2 ring-slate-600/30"
        style={{ width: size, height: size, filter: 'grayscale(1) brightness(0.4)' }}
      >
        <span style={{ fontSize: size * 0.5 }}>{achievement.icon}</span>
        {/* lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
          <svg xmlns="http://www.w3.org/2000/svg" width={size * 0.38} height={size * 0.38}
            viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl ring-2
        ${cfg.ringColor} ${cfg.glowColor}
        bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo}`}
      style={{ width: size, height: size }}
    >
      {/* inner glow for gold/legendary */}
      {(achievement.rarity === 'gold' || achievement.rarity === 'legendary') && (
        <div
          className="absolute inset-0 rounded-2xl opacity-30"
          style={{
            background: achievement.rarity === 'legendary'
              ? 'radial-gradient(circle at 40% 35%, rgba(216,180,254,0.8), transparent 65%)'
              : 'radial-gradient(circle at 40% 35%, rgba(253,224,71,0.8), transparent 65%)',
          }}
        />
      )}
      <span className="relative z-10" style={{ fontSize: size * 0.5 }}>
        {achievement.icon}
      </span>
    </div>
  )
}

// ─── Achievement Card ─────────────────────────────────────────────────────────

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const cfg = RARITY_CONFIG[achievement.rarity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl border overflow-hidden p-4 flex flex-col gap-3
        ${achievement.earned
          ? 'bg-[rgba(255,255,255,0.04)] border-white/[0.08]'
          : 'bg-[rgba(0,0,0,0.25)] border-white/[0.04]'}
        ${achievement.rarity === 'legendary' && achievement.earned
          ? 'border-purple-500/30 bg-[rgba(168,85,247,0.06)]'
          : ''}
        ${achievement.rarity === 'gold' && achievement.earned
          ? 'border-yellow-500/25 bg-[rgba(234,179,8,0.05)]'
          : ''}
      `}
    >
      {/* Rarity glow bg blob */}
      {achievement.earned && (achievement.rarity === 'legendary' || achievement.rarity === 'gold') && (
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-15 blur-2xl pointer-events-none"
          style={{
            background: achievement.rarity === 'legendary' ? '#a78bfa' : '#eab308',
          }}
        />
      )}

      {/* Top row: icon + rarity badge */}
      <div className="flex items-start justify-between">
        <BadgeIcon achievement={achievement} size={52} />
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
          ${cfg.bgColor} ${cfg.textColor} border border-current/20`}>
          {cfg.label}
        </span>
      </div>

      {/* Name & desc */}
      <div>
        <p className={`font-bold text-sm leading-snug ${achievement.earned ? 'text-white' : 'text-white/30'}`}>
          {achievement.name}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${achievement.earned ? 'text-white/50' : 'text-white/20'}`}>
          {achievement.desc}
        </p>
      </div>

      {/* Earned date OR progress bar */}
      {achievement.earned && achievement.date ? (
        <div className="flex items-center gap-1 mt-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] text-white/30">{achievement.date}</span>
        </div>
      ) : !achievement.earned && achievement.progress !== undefined ? (
        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/30">پیشرفت</span>
            <span className={`text-[10px] font-bold ${cfg.textColor}`}>{achievement.progress}٪</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              transition={{ duration: 0.8, delay: index * 0.06 + 0.3, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo}`}
            />
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const cfg = RARITY_CONFIG[achievement.rarity]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl
        border overflow-hidden min-w-0
        ${achievement.rarity === 'legendary'
          ? 'bg-purple-950/40 border-purple-500/35'
          : 'bg-yellow-950/25 border-yellow-500/25'}
      `}
    >
      {/* shine blob */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: achievement.rarity === 'legendary' ? '#c084fc' : '#fbbf24' }}
      />

      <BadgeIcon achievement={achievement} size={56} />

      <p className="text-xs font-bold text-white text-center leading-tight">
        {achievement.name}
      </p>

      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
        ${cfg.bgColor} ${cfg.textColor}`}>
        {cfg.label}
      </span>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Achievements() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<Category>('all')

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length
  const totalCount = ACHIEVEMENTS.length
  const completionPct = Math.round((earnedCount / totalCount) * 100)
  const userLevel = Math.floor(earnedCount / 2) + 1

  const featuredAchievements = ACHIEVEMENTS.filter((a) => a.featured && a.earned)

  const filtered =
    activeCategory === 'all'
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter((a) => a.category === activeCategory)

  // sort: earned first, then by rarity weight
  const rarityWeight: Record<Rarity, number> = { legendary: 4, gold: 3, silver: 2, bronze: 1 }
  const sorted = [...filtered].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    return rarityWeight[b.rarity] - rarityWeight[a.rarity]
  })

  return (
    <div
      className="h-full flex flex-col text-white overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(88,28,135,0.25) 0%, transparent 60%), #0a0a0f' }}
    >
      <div className="flex-1 overflow-y-auto overscroll-none pb-nav-safe">

        {/* ── Header ── */}
        <div
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-4"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,10,15,0.97) 70%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center justify-center w-9 h-9 rounded-xl
                       bg-white/[0.07] hover:bg-white/[0.12] transition active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">مدال‌ها و نشان‌ها</h1>
          </div>

          {/* earned counter badge */}
          <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30
                          rounded-full px-3 py-1">
            <span className="text-sm">🏅</span>
            <span className="text-xs font-bold text-yellow-300">{earnedCount}/{totalCount}</span>
          </div>
        </div>

        <div className="px-4 space-y-5 pb-6">

          {/* ── Progress Summary Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl overflow-hidden p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(88,28,135,0.5) 0%, rgba(49,46,129,0.45) 50%, rgba(15,23,42,0.6) 100%)',
              border: '1px solid rgba(168,85,247,0.25)',
              boxShadow: '0 8px 40px rgba(88,28,135,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            {/* background glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #c084fc, transparent)' }} />

            <div className="relative flex items-center gap-4">

              {/* Circular Progress */}
              <div className="relative flex-shrink-0">
                <CircularProgress value={completionPct} size={88} strokeWidth={7} color="#c084fc" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white">{completionPct}٪</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-white/40 mb-0.5">سطح کاربر</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black bg-gradient-to-r from-purple-300 to-indigo-300
                                     bg-clip-text text-transparent">
                      سطح {userLevel}
                    </span>
                    <span className="text-lg">⭐</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/[0.06] border border-white/[0.07] px-3 py-2">
                    <p className="text-[10px] text-white/40">دریافت شده</p>
                    <p className="text-base font-black text-yellow-300">{earnedCount}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] border border-white/[0.07] px-3 py-2">
                    <p className="text-[10px] text-white/40">باقی‌مانده</p>
                    <p className="text-base font-black text-white/60">{totalCount - earnedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Featured Achievements ── */}
          {featuredAchievements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">✨</span>
                <h2 className="text-sm font-bold text-white/70 tracking-wide uppercase">
                  برترین دستاوردها
                </h2>
              </div>
              <div className={`grid gap-3 ${featuredAchievements.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {featuredAchievements.map((a, i) => (
                  <FeaturedCard key={a.id} achievement={a} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Category Filter Chips ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id
              const countForCat = cat.id === 'all'
                ? ACHIEVEMENTS.length
                : ACHIEVEMENTS.filter((a) => a.category === cat.id).length

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap
                              text-xs font-semibold transition-all duration-200 active:scale-95 flex-shrink-0
                    ${isActive
                      ? 'bg-purple-600 text-white shadow-[0_0_16px_rgba(147,51,234,0.5)]'
                      : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.11] hover:text-white/80 border border-white/[0.07]'
                    }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5
                    ${isActive ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-white/35'}`}>
                    {countForCat}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Achievement Grid ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              {sorted.map((achievement, i) => (
                <AchievementCard key={achievement.id} achievement={achievement} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* ── Footer hint ── */}
          <div className="text-center pt-4">
            <p className="text-xs text-white/20">
              {totalCount - earnedCount} نشان دیگر برای کشف وجود دارد
            </p>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
