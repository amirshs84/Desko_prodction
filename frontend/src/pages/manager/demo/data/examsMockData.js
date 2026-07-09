export const EXAM_SUMMARY_STATS = [
  {
    title: 'آزمون‌های فعال',
    value: '۰',
    subtext: '۰٪ از برنامه ترم',
    type: 'progress',
    progress: 0,
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    title: 'مشارکت دانش‌آموزان',
    value: '۰٪',
    trend: '۰٪',
    trendLabel: 'نسبت به ماه قبل',
    type: 'sparkline',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    title: 'میانگین عملکرد',
    value: '۰',
    trend: '۰',
    trendLabel: 'نسبت به ماه قبل',
    type: 'miniBar',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
  },
  {
    title: 'آزمون نیازمند بررسی',
    value: '۰',
    subtext: 'نیاز به اقدام',
    type: 'warning',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
  },
];

export const SPARKLINE_DATA = [
  { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 },
];

export const MINI_BAR_DATA = [
  { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 },
];

export const CURRENT_EXAMS = [];

export const EXAM_STATUS_CONFIG = {
  ready: { label: 'آماده برگزاری', color: '#059669', bg: '#D1FAE5' },
  grading: { label: 'در حال تصحیح', color: '#D97706', bg: '#FEF3C7' },
  published: { label: 'نتایج منتشر شد', color: '#2563EB', bg: '#DBEAFE' },
};

export const UPCOMING_EXAMS = [];

export const PERFORMANCE_TREND = [
  { month: 'دی', score: 0, participation: 0, pass: 0 },
  { month: 'بهمن', score: 0, participation: 0, pass: 0 },
  { month: 'اسفند', score: 0, participation: 0, pass: 0 },
  { month: 'فروردین', score: 0, participation: 0, pass: 0 },
  { month: 'اردیبهشت', score: 0, participation: 0, pass: 0 },
  { month: 'خرداد', score: 0, participation: 0, pass: 0 },
];

export const CHART_TABS = [
  { id: 'score', label: 'میانگین نمره', key: 'score' },
  { id: 'participation', label: 'نرخ شرکت', key: 'participation' },
  { id: 'pass', label: 'درصد قبولی', key: 'pass' },
];

export const SUBJECT_WEAKNESS = [];

export const GRADE_DISTRIBUTION = [
  { name: '۰-۱۰', value: 0, color: '#EF4444' },
  { name: '۱۰-۱۵', value: 0, color: '#F97316' },
  { name: '۱۵-۱۸', value: 0, color: '#F59E0B' },
  { name: '۱۸-۲۰', value: 0, color: '#10B981' },
];

export const SMART_INSIGHTS = [];

export const EXAM_CARDS = [];

export const TOP_STUDENTS_RANKING = [];
