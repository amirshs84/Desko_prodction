export const EXAM_SUMMARY_STATS = [
  {
    title: 'آزمون‌های فعال',
    value: '۱۲',
    subtext: '۶۵٪ از برنامه ترم',
    type: 'progress',
    progress: 65,
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    title: 'مشارکت دانش‌آموزان',
    value: '۸۹٪',
    trend: '+۷٪',
    trendLabel: 'نسبت به ماه قبل',
    type: 'sparkline',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    title: 'میانگین عملکرد',
    value: '۸۴.۳',
    trend: '+۵.۲',
    trendLabel: 'نسبت به ماه قبل',
    type: 'miniBar',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
  },
  {
    title: 'آزمون نیازمند بررسی',
    value: '۵',
    subtext: 'نیاز به اقدام',
    type: 'warning',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
  },
];

export const SPARKLINE_DATA = [
  { v: 72 }, { v: 78 }, { v: 75 }, { v: 82 }, { v: 85 }, { v: 89 },
];

export const MINI_BAR_DATA = [
  { v: 78 }, { v: 80 }, { v: 79 }, { v: 82 }, { v: 84 },
];

export const CURRENT_EXAMS = [
  {
    id: 1,
    title: 'آزمون ریاضی نهایی',
    grade: 'پایه دوازدهم',
    detail: '۲۵ خرداد ۱۴۰۴ • ۱۲۰ شرکت‌کننده',
    status: 'ready',
    progress: 100,
    icon: 'math',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
  },
  {
    id: 2,
    title: 'آزمون میان‌ترم علوم',
    grade: 'پایه یازدهم',
    detail: '۲۰ خرداد ۱۴۰۴ • ۹۸ شرکت‌کننده',
    status: 'grading',
    progress: 65,
    icon: 'science',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    id: 3,
    title: 'آزمون زبان انگلیسی',
    grade: 'پایه دهم',
    detail: '۱۵ خرداد ۱۴۰۴ • ۱۱۰ شرکت‌کننده',
    status: 'published',
    progress: 100,
    icon: 'english',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
  },
];

export const EXAM_STATUS_CONFIG = {
  ready: { label: 'آماده برگزاری', color: '#059669', bg: '#D1FAE5' },
  grading: { label: 'در حال تصحیح', color: '#D97706', bg: '#FEF3C7' },
  published: { label: 'نتایج منتشر شد', color: '#2563EB', bg: '#DBEAFE' },
};

export const UPCOMING_EXAMS = [
  { day: '۲۵', month: 'خرداد', title: 'آزمون فیزیک', grade: 'پایه دوازدهم', time: '۰۹:۰۰' },
  { day: '۲۸', month: 'خرداد', title: 'آزمون شیمی', grade: 'پایه یازدهم', time: '۱۰:۳۰' },
  { day: '۱', month: 'تیر', title: 'آزمون ادبیات', grade: 'پایه دهم', time: '۰۸:۰۰' },
  { day: '۵', month: 'تیر', title: 'آزمون زیست', grade: 'پایه دوازدهم', time: '۰۹:۳۰' },
];

export const PERFORMANCE_TREND = [
  { month: 'دی', score: 78, participation: 85, pass: 72 },
  { month: 'بهمن', score: 80, participation: 87, pass: 74 },
  { month: 'اسفند', score: 79, participation: 86, pass: 73 },
  { month: 'فروردین', score: 82, participation: 88, pass: 76 },
  { month: 'اردیبهشت', score: 83, participation: 89, pass: 78 },
  { month: 'خرداد', score: 84.3, participation: 89, pass: 80 },
];

export const CHART_TABS = [
  { id: 'score', label: 'میانگین نمره', key: 'score' },
  { id: 'participation', label: 'نرخ شرکت', key: 'participation' },
  { id: 'pass', label: 'درصد قبولی', key: 'pass' },
];

export const SUBJECT_WEAKNESS = [
  { subject: 'ریاضی', rate: 45, color: '#EF4444' },
  { subject: 'فیزیک', rate: 52, color: '#F97316' },
  { subject: 'شیمی', rate: 58, color: '#F59E0B' },
  { subject: 'ادبیات', rate: 72, color: '#14B8A6' },
  { subject: 'زبان انگلیسی', rate: 81, color: '#10B981' },
];

export const GRADE_DISTRIBUTION = [
  { name: '۰-۱۰', value: 8, color: '#EF4444' },
  { name: '۱۰-۱۵', value: 18, color: '#F97316' },
  { name: '۱۵-۱۸', value: 34, color: '#F59E0B' },
  { name: '۱۸-۲۰', value: 40, color: '#10B981' },
];

export const SMART_INSIGHTS = [
  { text: 'افت ۱۲٪ عملکرد در آزمون فیزیک پایه دوازدهم نسبت به ماه قبل', icon: 'down', color: '#EF4444', bg: '#FEE2E2' },
  { text: 'پیشرفت ۸٪ در آزمون زبان انگلیسی پایه دهم', icon: 'up', color: '#10B981', bg: '#D1FAE5' },
  { text: 'پیشنهاد: برگزاری آزمون جبرانی ریاضی برای ۱۸ دانش‌آموز', icon: 'idea', color: '#3B82F6', bg: '#DBEAFE' },
];

export const EXAM_CARDS = [
  { subject: 'ریاضی', grade: 'پایه دوازدهم', participation: 92, average: 16.8, count: 120, icon: 'math', iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { subject: 'علوم', grade: 'پایه یازدهم', participation: 88, average: 15.4, count: 98, icon: 'science', iconBg: '#D1FAE5', iconColor: '#10B981' },
  { subject: 'زبان', grade: 'پایه دهم', participation: 95, average: 17.2, count: 110, icon: 'english', iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
  { subject: 'ادبیات', grade: 'پایه یازدهم', participation: 90, average: 16.1, count: 105, icon: 'literature', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
];

export const TOP_STUDENTS_RANKING = [
  { rank: 1, name: 'علی احمدی', grade: 'پایه دوازدهم', score: 19.8, initials: 'ع.ا', color: '#10B981', medal: '🥇' },
  { rank: 2, name: 'سارا محمدی', grade: 'پایه یازدهم', score: 19.5, initials: 'س.م', color: '#3B82F6', medal: '🥈' },
  { rank: 3, name: 'پارسا جلالی', grade: 'پایه دوازدهم', score: 19.2, initials: 'پ.ج', color: '#8B5CF6', medal: '🥉' },
];
