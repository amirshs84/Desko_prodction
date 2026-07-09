export const GRADES_SUMMARY_STATS = [
  {
    title: 'میانگین کل مدرسه',
    value: '۰',
    unit: 'از ۱۰۰',
    trend: '۰٪',
    trendLabel: 'نسبت به ترم قبل',
    type: 'sparkline',
  },
  {
    title: 'بیشترین رشد',
    value: '—',
    trend: '۰٪',
    type: 'growth',
  },
  {
    title: 'دانش‌آموزان نیازمند توجه',
    value: '۰ نفر',
    subtext: '۰٪ از کل دانش‌آموزان',
    type: 'warning',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
  },
  {
    title: 'ممتازها',
    value: '۰ نفر',
    subtext: '۰٪ از کل دانش‌آموزان',
    type: 'excellent',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
  },
  {
    title: 'سخت‌ترین درس',
    value: '—',
    subtext: 'میانگین ۰ از ۱۰۰',
    type: 'hardest',
    progress: 0,
  },
];

export const SPARKLINE_TREND = [
  { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 },
];

export const GRADE_FILTERS = [
  'سال تحصیلی',
  'پایه',
  'کلاس',
  'درس',
  'دوره امتحانی',
];

export const HEATMAP_GRADES = ['هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم'];
export const HEATMAP_SUBJECTS = ['ریاضی', 'علوم', 'فارسی', 'زبان'];

export const HEATMAP_DATA = {
  هفتم: { ریاضی: 0, علوم: 0, فارسی: 0, زبان: 0 },
  هشتم: { ریاضی: 0, علوم: 0, فارسی: 0, زبان: 0 },
  نهم: { ریاضی: 0, علوم: 0, فارسی: 0, زبان: 0 },
  دهم: { ریاضی: 0, علوم: 0, فارسی: 0, زبان: 0 },
  یازدهم: { ریاضی: 0, علوم: 0, فارسی: 0, زبان: 0 },
};

export function getHeatmapColor(score) {
  if (score >= 80) return { bg: '#D1FAE5', color: '#059669' };
  if (score >= 70) return { bg: '#FEF3C7', color: '#D97706' };
  if (score >= 60) return { bg: '#FFEDD5', color: '#EA580C' };
  return { bg: '#FEE2E2', color: '#DC2626' };
}

export const SCHOOL_AVERAGE_TREND = [
  { month: 'تیر', value: 0 },
  { month: 'مرداد', value: 0 },
  { month: 'شهریور', value: 0 },
  { month: 'مهر', value: 0 },
  { month: 'آبان', value: 0 },
  { month: 'آذر', value: 0 },
  { month: 'دی', value: 0 },
  { month: 'بهمن', value: 0 },
  { month: 'اسفند', value: 0 },
  { month: 'فروردین', value: 0 },
  { month: 'اردیبهشت', value: 0 },
  { month: 'خرداد', value: 0 },
];

export const PERFORMANCE_DISTRIBUTION = [
  { label: 'عالی', percent: 0, color: '#10B981', bg: '#D1FAE5' },
  { label: 'خوب', percent: 0, color: '#34D399', bg: '#A7F3D0' },
  { label: 'متوسط', percent: 0, color: '#F59E0B', bg: '#FEF3C7' },
  { label: 'ضعیف', percent: 0, color: '#EF4444', bg: '#FEE2E2' },
];

export const CLASS_RANKINGS = [];

export const TEACHER_RANKINGS = [];

export const SUBJECT_DIFFICULTY = [];

export const STUDENTS_AT_RISK = [];

export const SMART_ANALYSIS = {
  summary: 'داده‌ای برای تحلیل وجود ندارد.',
  suggestion: '',
};

export function formatScore(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
}
