export const TEACHER_PERFORMANCE_BARS = [];

export const SUBJECT_TEACHER_DISTRIBUTION = [];

export const WORKFORCE_SUMMARY = [
  { label: 'معلمان فعال', value: '۰', icon: 'active', color: '#10B981', bg: '#D1FAE5' },
  { label: 'میانگین سابقه تدریس', value: '۰ سال', icon: 'experience', color: '#3B82F6', bg: '#DBEAFE' },
  { label: 'میانگین کلاس هر معلم', value: '۰ کلاس', icon: 'classes', color: '#8B5CF6', bg: '#EDE9FE' },
  { label: 'معلمان با ارزیابی عالی', value: '۰ (۰٪)', icon: 'excellent', color: '#10B981', bg: '#D1FAE5' },
  { label: 'نیازمند پیگیری', value: '۰ (۰٪)', icon: 'alert', color: '#EF4444', bg: '#FEE2E2' },
];

export const TEACHERS_TABLE = [];

export const TOP_TEACHERS = [];

export const TEACHERS_NEEDING_ATTENTION = [];

export const RECENT_TEACHER_ACTIVITIES = [];

export const TEACHERS_FOOTER_KPIS = [
  { title: 'معلمان فعال', value: '۰', trend: '۰ نفر', icon: 'teacher', iconBg: '#D1FAE5', iconColor: '#10B981' },
  { title: 'کلاس‌های تحت پوشش', value: '۰', trend: '۰ کلاس', icon: 'book', iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { title: 'میانگین ارزیابی', value: '۰/۵', trend: '۰', icon: 'star', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { title: 'میانگین حضور معلمان', value: '۰٪', trend: '۰٪', icon: 'clipboard', iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
];

export function getRatingColor(rating) {
  if (rating >= 4.5) return '#10B981';
  if (rating >= 3.5) return '#F59E0B';
  return '#EF4444';
}

export function formatRating(rating) {
  return rating.toFixed(1).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
}

export function formatAttendance(rate) {
  return `${String(rate).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])}٪`;
}

export function formatCount(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
