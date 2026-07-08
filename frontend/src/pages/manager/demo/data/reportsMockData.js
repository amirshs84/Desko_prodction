export const REPORTS_SUMMARY_STATS = [
  {
    title: 'گزارش‌های ایجاد شده',
    value: '۲۸',
    trend: '+۳۰٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
    icon: 'created',
  },
  {
    title: 'گزارش‌های برنامه‌ریزی شده',
    value: '۷',
    trend: '+۲۲٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    icon: 'scheduled',
  },
  {
    title: 'دانلود گزارش‌ها',
    value: '۱,۲۴۶',
    trend: '+۱۸٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
    icon: 'download',
  },
  {
    title: 'گزارش‌های اشتراکی',
    value: '۱۸',
    trend: '+۱۲٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    icon: 'share',
  },
];

export const REPORT_CATEGORIES = [
  { name: 'عملکرد دانش‌آموزان', value: 36, color: '#10B981' },
  { name: 'حضور و غیاب', value: 25, color: '#3B82F6' },
  { name: 'مالی', value: 18, color: '#F59E0B' },
  { name: 'آموزشی', value: 14, color: '#8B5CF6' },
  { name: 'تکمیلی', value: 7, color: '#EC4899' },
];

export const LATEST_REPORTS = [
  { title: 'گزارش عملکرد ماهانه دانش‌آموزان', date: '۲۴ اردیبهشت ۱۴۰۴', type: 'pdf', color: '#EF4444' },
  { title: 'گزارش حضور و غیاب هفتگی', date: '۲۲ اردیبهشت ۱۴۰۴', type: 'excel', color: '#10B981' },
  { title: 'گزارش مالی فصل اول', date: '۲۰ اردیبهشت ۱۴۰۴', type: 'pdf', color: '#EF4444' },
  { title: 'گزارش عملکرد معلمان', date: '۱۸ اردیبهشت ۱۴۰۴', type: 'word', color: '#3B82F6' },
  { title: 'گزارش آزمون‌های میان‌ترم', date: '۱۵ اردیبهشت ۱۴۰۴', type: 'pdf', color: '#EF4444' },
];

export const MOST_USED_REPORTS = [
  { title: 'گزارش حضور و غیاب روزانه', count: 12 },
  { title: 'گزارش عملکرد دانش‌آموزان', count: 9 },
  { title: 'گزارش نمرات فصل', count: 8 },
  { title: 'گزارش مالی ماهانه', count: 6 },
  { title: 'گزارش آزمون‌ها', count: 5 },
];

export const CREATION_TREND = [
  { month: 'آذر', count: 8 },
  { month: 'دی', count: 10 },
  { month: 'بهمن', count: 12 },
  { month: 'اسفند', count: 14 },
  { month: 'فروردین', count: 11 },
  { month: 'اردیبهشت', count: 13 },
];

export const REPORT_FORMATS = [
  { name: 'PDF', value: 35, color: '#EF4444' },
  { name: 'Excel', value: 30, color: '#10B981' },
  { name: 'Word', value: 20, color: '#3B82F6' },
  { name: 'CSV', value: 10, color: '#F59E0B' },
  { name: 'Image', value: 5, color: '#8B5CF6' },
];

export const REPORT_PERFORMANCE = [
  { label: 'دقت داده‌ها', percent: 94 },
  { label: 'به‌موقع بودن', percent: 88 },
  { label: 'کامل بودن', percent: 91 },
  { label: 'رضایت کاربران', percent: 90 },
];

export function formatCountFa(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
