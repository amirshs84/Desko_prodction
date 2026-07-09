export const REPORTS_SUMMARY_STATS = [
  {
    title: 'گزارش‌های ایجاد شده',
    value: '۰',
    trend: '۰٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
    icon: 'created',
  },
  {
    title: 'گزارش‌های برنامه‌ریزی شده',
    value: '۰',
    trend: '۰٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    icon: 'scheduled',
  },
  {
    title: 'دانلود گزارش‌ها',
    value: '۰',
    trend: '۰٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
    icon: 'download',
  },
  {
    title: 'گزارش‌های اشتراکی',
    value: '۰',
    trend: '۰٪',
    trendLabel: 'نسبت به ماه قبل',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    icon: 'share',
  },
];

export const REPORT_CATEGORIES = [
  { name: 'عملکرد دانش‌آموزان', value: 0, color: '#10B981' },
  { name: 'حضور و غیاب', value: 0, color: '#3B82F6' },
  { name: 'مالی', value: 0, color: '#F59E0B' },
  { name: 'آموزشی', value: 0, color: '#8B5CF6' },
  { name: 'تکمیلی', value: 0, color: '#EC4899' },
];

export const LATEST_REPORTS = [];

export const MOST_USED_REPORTS = [];

export const CREATION_TREND = [
  { month: 'آذر', count: 0 },
  { month: 'دی', count: 0 },
  { month: 'بهمن', count: 0 },
  { month: 'اسفند', count: 0 },
  { month: 'فروردین', count: 0 },
  { month: 'اردیبهشت', count: 0 },
];

export const REPORT_FORMATS = [
  { name: 'PDF', value: 0, color: '#EF4444' },
  { name: 'Excel', value: 0, color: '#10B981' },
  { name: 'Word', value: 0, color: '#3B82F6' },
  { name: 'CSV', value: 0, color: '#F59E0B' },
  { name: 'Image', value: 0, color: '#8B5CF6' },
];

export const REPORT_PERFORMANCE = [
  { label: 'دقت داده‌ها', percent: 0 },
  { label: 'به‌موقع بودن', percent: 0 },
  { label: 'کامل بودن', percent: 0 },
  { label: 'رضایت کاربران', percent: 0 },
];

export function formatCountFa(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
