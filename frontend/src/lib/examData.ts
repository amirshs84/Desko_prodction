export type SubjectResult = {
  name: string
  score: number
  time: number
  delta: number
  correct: number
  wrong: number
  total: number
  color: string
  glow: string
  icon: string
}

export type SkillPoint = {
  name: string
  value: number
}

export type ScorePoint = {
  label: string
  score: number
}

export type ExamData = {
  title: string
  subtitle: string
  date: string
  duration: string
  score: number
  maxScore: number
  rank: number
  totalParticipants: number
  previousScore: number
  average: number
  bestSubject: string
  weakestSubject: string
  status: 'excellent' | 'good' | 'needsPractice'
  subjects: SubjectResult[]
  scoreHistory: ScorePoint[]
  skills: SkillPoint[]
}

export const MOCK_EXAM: ExamData = {
  title: 'آزمون جامع خرداد',
  subtitle: 'فیزیک · ریاضی · شیمی · زیست · ادبیات',
  date: '۱۵ خرداد ۱۴۰۳',
  duration: '۱۸۰ دقیقه',
  score: 87,
  maxScore: 100,
  rank: 12,
  totalParticipants: 340,
  previousScore: 75,
  average: 81,
  bestSubject: 'ریاضی',
  weakestSubject: 'شیمی',
  status: 'excellent',
  subjects: [
    {
      name: 'ریاضی',
      score: 92,
      time: 24,
      delta: 8,
      correct: 23,
      wrong: 2,
      total: 25,
      color: '#34d399',
      glow: 'rgba(52,211,153,0.35)',
      icon: '∫',
    },
    {
      name: 'فیزیک',
      score: 85,
      time: 31,
      delta: 5,
      correct: 17,
      wrong: 3,
      total: 20,
      color: '#60a5fa',
      glow: 'rgba(96,165,250,0.35)',
      icon: 'φ',
    },
    {
      name: 'شیمی',
      score: 65,
      time: 28,
      delta: -3,
      correct: 13,
      wrong: 7,
      total: 20,
      color: '#f87171',
      glow: 'rgba(248,113,113,0.35)',
      icon: '⚗',
    },
    {
      name: 'زیست',
      score: 88,
      time: 22,
      delta: 15,
      correct: 22,
      wrong: 3,
      total: 25,
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.35)',
      icon: '🧬',
    },
    {
      name: 'ادبیات',
      score: 76,
      time: 19,
      delta: 2,
      correct: 38,
      wrong: 12,
      total: 50,
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.35)',
      icon: '📖',
    },
  ],
  scoreHistory: [
    { label: 'آبان', score: 62 },
    { label: 'آذر', score: 68 },
    { label: 'دی', score: 71 },
    { label: 'بهمن', score: 75 },
    { label: 'خرداد', score: 87 },
  ],
  skills: [
    { name: 'تحلیل', value: 85 },
    { name: 'حفظیات', value: 78 },
    { name: 'محاسبات', value: 92 },
    { name: 'مفاهیم', value: 80 },
    { name: 'سرعت', value: 70 },
  ],
}

export const STATUS_META = {
  excellent: { label: 'عالی', color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)' },
  good: { label: 'خوب', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.4)' },
  needsPractice: { label: 'نیاز به تمرین', color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)' },
}
