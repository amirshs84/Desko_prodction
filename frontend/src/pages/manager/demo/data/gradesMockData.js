export const GRADES_SUMMARY_STATS = [
  {
    title: 'میانگین کل مدرسه',
    value: '۸۴.۲',
    unit: 'از ۱۰۰',
    trend: '+۲.۸٪',
    trendLabel: 'نسبت به ترم قبل',
    type: 'sparkline',
  },
  {
    title: 'بیشترین رشد',
    value: 'پایه هشتم',
    trend: '+۸.۴٪',
    type: 'growth',
  },
  {
    title: 'دانش‌آموزان نیازمند توجه',
    value: '۲۴ نفر',
    subtext: '۶.۸٪ از کل دانش‌آموزان',
    type: 'warning',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
  },
  {
    title: 'ممتازها',
    value: '۴۸ نفر',
    subtext: '۱۴٪ از کل دانش‌آموزان',
    type: 'excellent',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
  },
  {
    title: 'سخت‌ترین درس',
    value: 'ریاضی',
    subtext: 'میانگین ۶۸ از ۱۰۰',
    type: 'hardest',
    progress: 68,
  },
];

export const SPARKLINE_TREND = [
  { v: 80 }, { v: 81 }, { v: 82 }, { v: 81 }, { v: 83 }, { v: 84.2 },
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
  هفتم: { ریاضی: 82, علوم: 85, فارسی: 88, زبان: 79 },
  هشتم: { ریاضی: 78, علوم: 81, فارسی: 86, زبان: 84 },
  نهم: { ریاضی: 72, علوم: 76, فارسی: 83, زبان: 80 },
  دهم: { ریاضی: 68, علوم: 74, فارسی: 81, زبان: 77 },
  یازدهم: { ریاضی: 65, علوم: 71, فارسی: 79, زبان: 82 },
};

export function getHeatmapColor(score) {
  if (score >= 80) return { bg: '#D1FAE5', color: '#059669' };
  if (score >= 70) return { bg: '#FEF3C7', color: '#D97706' };
  if (score >= 60) return { bg: '#FFEDD5', color: '#EA580C' };
  return { bg: '#FEE2E2', color: '#DC2626' };
}

export const SCHOOL_AVERAGE_TREND = [
  { month: 'تیر', value: 79 },
  { month: 'مرداد', value: 80 },
  { month: 'شهریور', value: 81 },
  { month: 'مهر', value: 84.2 },
  { month: 'آبان', value: 83 },
  { month: 'آذر', value: 84 },
  { month: 'دی', value: 82 },
  { month: 'بهمن', value: 83.5 },
  { month: 'اسفند', value: 84 },
  { month: 'فروردین', value: 85 },
  { month: 'اردیبهشت', value: 84.5 },
  { month: 'خرداد', value: 84.2 },
];

export const PERFORMANCE_DISTRIBUTION = [
  { label: 'عالی', percent: 32, color: '#10B981', bg: '#D1FAE5' },
  { label: 'خوب', percent: 41, color: '#34D399', bg: '#A7F3D0' },
  { label: 'متوسط', percent: 18, color: '#F59E0B', bg: '#FEF3C7' },
  { label: 'ضعیف', percent: 9, color: '#EF4444', bg: '#FEE2E2' },
];

export const CLASS_RANKINGS = [
  { rank: 1, name: 'دهم ریاضی الف', score: 91.2, medal: '🥇' },
  { rank: 2, name: 'یازدهم تجربی ۲', score: 89.8, medal: '🥈' },
  { rank: 3, name: 'نهم ریاضی ۱', score: 88.5, medal: '🥉' },
  { rank: 4, name: 'دوازدهم ریاضی ۲', score: 87.3, medal: '۴' },
  { rank: 5, name: 'هشتم ۳', score: 86.1, medal: '۵' },
];

export const TEACHER_RANKINGS = [
  { name: 'آقای احمدی', subject: 'ریاضی', score: 88.4, initials: 'آ.ا', color: '#10B981' },
  { name: 'خانم رضایی', subject: 'فیزیک', score: 86.7, initials: 'خ.ر', color: '#3B82F6' },
  { name: 'آقای کریمی', subject: 'شیمی', score: 85.2, initials: 'آ.ک', color: '#8B5CF6' },
];

export const SUBJECT_DIFFICULTY = [
  { subject: 'ریاضی', score: 68, color: '#EF4444' },
  { subject: 'فیزیک', score: 71, color: '#F97316' },
  { subject: 'شیمی', score: 74, color: '#F59E0B' },
  { subject: 'زبان انگلیسی', score: 79, color: '#14B8A6' },
  { subject: 'فارسی', score: 83, color: '#10B981' },
];

export const STUDENTS_AT_RISK = [
  { name: 'رضا باقری', grade: 'پایه نهم', drop: 14, initials: 'ر.ب', color: '#EF4444' },
  { name: 'مریم حسینی', grade: 'پایه دهم', drop: 12, initials: 'م.ح', color: '#F97316' },
  { name: 'محسن کریمی', grade: 'پایه یازدهم', drop: 11, initials: 'م.ک', color: '#F59E0B' },
  { name: 'سارا اکبری', grade: 'پایه هشتم', drop: 9, initials: 'س.ا', color: '#F59E0B' },
];

export const SMART_ANALYSIS = {
  summary: 'افت ۶.۲٪ میانگین نمرات ریاضی پایه نهم در ۲ ماه اخیر شناسایی شد. این افت عمدتاً در واحدهای «هندسه» و «معادلات» مشاهده می‌شود.',
  suggestion: 'پیشنهاد هوشمند: برگزاری آزمون تشخیصی برای ۳۲ دانش‌آموز پایه نهم',
};

export function formatScore(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
}
