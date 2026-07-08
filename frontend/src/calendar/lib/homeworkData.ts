export type Priority = 'high' | 'medium' | 'low'
export type HomeworkStatus = 'assigned' | 'submitted' | 'graded'

export type Attachment = {
  id: string
  name: string
}

export type HomeworkItem = {
  id: string
  subjectKey: string
  courseName: string
  title: string
  description: string
  descriptionFull: string
  dueAt: string
  dueTimeDisplay: string
  priority: Priority
  status: HomeworkStatus
  attachments: Attachment[]
  grade?: string
  feedback?: string
}

export const SUBJECT_CONFIGS: Record<
  string,
  { icon: string; bg: string; color: string; border: string }
> = {
  math: {
    icon: '√x',
    bg: 'bg-blue-500/15',
    color: 'text-blue-400',
    border: 'border-blue-500/25',
  },
  chemistry: {
    icon: '⚗',
    bg: 'bg-purple-500/15',
    color: 'text-purple-400',
    border: 'border-purple-500/25',
  },
  physics: {
    icon: '⚛',
    bg: 'bg-cyan-500/15',
    color: 'text-cyan-400',
    border: 'border-cyan-500/25',
  },
  english: {
    icon: 'Ab',
    bg: 'bg-yellow-500/15',
    color: 'text-yellow-400',
    border: 'border-yellow-500/25',
  },
  biology: {
    icon: '🔬',
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-400',
    border: 'border-emerald-500/25',
  },
  history: {
    icon: '📜',
    bg: 'bg-orange-500/15',
    color: 'text-orange-400',
    border: 'border-orange-500/25',
  },
  geography: {
    icon: '🌍',
    bg: 'bg-teal-500/15',
    color: 'text-teal-400',
    border: 'border-teal-500/25',
  },
  algorithm: {
    icon: '⚙',
    bg: 'bg-slate-500/15',
    color: 'text-slate-300',
    border: 'border-slate-500/25',
  },
  literature: {
    icon: '📖',
    bg: 'bg-pink-500/15',
    color: 'text-pink-400',
    border: 'border-pink-500/25',
  },
}

export const DEFAULT_SUBJECT: (typeof SUBJECT_CONFIGS)[string] = {
  icon: '📚',
  bg: 'bg-gray-500/15',
  color: 'text-gray-400',
  border: 'border-gray-500/25',
}

const _now = new Date()
const d = (offsetDays: number) =>
  new Date(_now.getTime() + offsetDays * 86_400_000).toISOString()

export const HOMEWORK_DATA: HomeworkItem[] = [
  {
    id: 'hw-1',
    subjectKey: 'chemistry',
    courseName: 'شیمی',
    title: 'تکلیف شیمی',
    description: 'فصل سوم: واکنش‌های آلی',
    descriptionFull:
      'سوالات ۱ تا ۵ از فصل سوم کتاب را حل کنید. برای هر واکنش معادله موازنه‌شده و مکانیزم واکنش را بنویسید. تحویل به صورت دست‌نویس یا PDF با نام‌گذاری شماره‌دانش‌آموزی-فصل۳.',
    dueAt: d(0.3),
    dueTimeDisplay: '23:30',
    priority: 'high',
    status: 'assigned',
    attachments: [
      { id: 'a1', name: 'سوالات-فصل۳.pdf' },
      { id: 'a2', name: 'جزوه-شیمی-آلی.pdf' },
    ],
  },
  {
    id: 'hw-2',
    subjectKey: 'math',
    courseName: 'ریاضیات',
    title: 'مجموعه تمرین ریاضی',
    description: 'جبر • معادلات درجه دوم',
    descriptionFull:
      'تمرینات صفحه ۸۴ تا ۸۷ کتاب را حل کنید. شامل رسم نمودار و تحلیل تابع درجه دوم. برای هر سوال نمودار دقیق رسم شود.',
    dueAt: d(1),
    dueTimeDisplay: '14:00',
    priority: 'medium',
    status: 'assigned',
    attachments: [],
  },
  {
    id: 'hw-3',
    subjectKey: 'english',
    courseName: 'انگلیسی',
    title: 'انشای انگلیسی',
    description: 'بررسی ادبیات مدرن',
    descriptionFull:
      'یک مقاله ۵۰۰ کلمه‌ای درباره یکی از نویسندگان ادبیات مدرن بنویسید. منابع باید معتبر و به زبان انگلیسی باشند.',
    dueAt: d(1),
    dueTimeDisplay: '17:00',
    priority: 'medium',
    status: 'assigned',
    attachments: [{ id: 'a3', name: 'دستورالعمل-مقاله.pdf' }],
  },
  {
    id: 'hw-4',
    subjectKey: 'physics',
    courseName: 'فیزیک',
    title: 'گزارش آزمایشگاه',
    description: 'آزمایش: حرکت آونگ',
    descriptionFull:
      'گزارش آزمایش آونگ ساده را بنویسید. شامل هدف، وسایل، روش کار، نتایج جدولی، رسم نمودار T برحسب L و نتیجه‌گیری.',
    dueAt: d(1),
    dueTimeDisplay: '20:00',
    priority: 'low',
    status: 'assigned',
    attachments: [],
  },
  {
    id: 'hw-5',
    subjectKey: 'geography',
    courseName: 'جغرافیا',
    title: 'پروژه جغرافیا',
    description: 'کشورها و پایتخت‌ها',
    descriptionFull:
      'نقشه قاره آسیا را رسم کرده و ۲۰ کشور با پایتخت‌هایشان را مشخص کنید. مقیاس نقشه را رعایت کنید.',
    dueAt: d(2),
    dueTimeDisplay: '',
    priority: 'low',
    status: 'assigned',
    attachments: [],
  },
  {
    id: 'hw-6',
    subjectKey: 'history',
    courseName: 'تاریخ',
    title: 'مطالعه تاریخ',
    description: 'فصل پنجم: دوران صفوی',
    descriptionFull:
      'فصل پنجم کتاب تاریخ را مطالعه کنید و خلاصه‌ای ۲ صفحه‌ای از مهم‌ترین رویدادهای دوران صفوی بنویسید.',
    dueAt: d(2),
    dueTimeDisplay: '',
    priority: 'low',
    status: 'submitted',
    attachments: [],
  },
  {
    id: 'hw-7',
    subjectKey: 'algorithm',
    courseName: 'طراحی الگوریتم',
    title: 'پیاده‌سازی کوله‌پشتی',
    description: 'کد + تحلیل پیچیدگی زمانی',
    descriptionFull:
      'مسئله کوله‌پشتی ۰/۱ را با برنامه‌نویسی پویا پیاده‌سازی کنید. تحویل: سورس کد، توضیح حالت‌ها و تحلیل O(nW).',
    dueAt: d(-1),
    dueTimeDisplay: '23:59',
    priority: 'high',
    status: 'graded',
    attachments: [{ id: 'a4', name: 'ورودی‌های-نمونه.zip' }],
    grade: '۱۸/۲۰',
    feedback:
      'عالی بود! فقط در تحلیل پیچیدگی بهتر بود فضای حافظه مصرفی را هم بررسی می‌کردی. موفق باشی.',
  },
]

export function daysUntilDue(dueIso: string): number {
  const due = new Date(dueIso)
  const now = new Date()
  const sd = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const sn = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return (sd.getTime() - sn.getTime()) / 86_400_000
}

export function urgencyBorderClass(days: number, priority: Priority): string {
  if (days < 0)
    return 'border-red-500/70 shadow-[0_0_22px_rgba(239,68,68,0.28)]'
  if (days === 0 || priority === 'high')
    return 'border-red-400/55 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
  if (days <= 2 || priority === 'medium')
    return 'border-yellow-400/55 shadow-[0_0_16px_rgba(234,179,8,0.2)]'
  return 'border-[#39FF14]/35 shadow-[0_0_12px_rgba(57,255,20,0.1)]'
}

export function priorityMeta(p: Priority): { label: string; cls: string } {
  if (p === 'high')
    return {
      label: 'فوری',
      cls: 'bg-red-500/20 text-red-300 border-red-400/45',
    }
  if (p === 'medium')
    return {
      label: 'متوسط',
      cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/45',
    }
  return {
    label: 'عادی',
    cls: 'bg-[#39FF14]/10 text-[#bdfcbd] border-[#39FF14]/35',
  }
}

export function statusMeta(s: HomeworkStatus): { label: string; cls: string } {
  if (s === 'assigned')
    return {
      label: 'جدید',
      cls: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
    }
  if (s === 'submitted')
    return {
      label: 'تحویل داده شده',
      cls: 'bg-white/5 text-[var(--t-ink-3)] border-white/10',
    }
  return {
    label: 'نمره‌دهی شده',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  }
}
