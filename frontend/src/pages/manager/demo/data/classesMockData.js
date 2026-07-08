export const CLASS_PERFORMANCE_BARS = [
  { name: 'ریاضی ۱۱/۱', score: 92, color: '#10B981', label: '۹۲' },
  { name: 'فیزیک ۱۲/۲', score: 78, color: '#F59E0B', label: '۷۸' },
  { name: 'شیمی ۱۰/۳', score: 85, color: '#10B981', label: '۸۵' },
  { name: 'ادبیات ۱۱/۲', score: 71, color: '#F59E0B', label: '۷۱' },
  { name: 'زیست ۱۲/۱', score: 55, color: '#EF4444', label: '۵۵' },
  { name: 'زبان ۱۰/۱', score: 88, color: '#10B981', label: '۸۸' },
];

export const SUBJECT_DISTRIBUTION = [
  { name: 'ریاضی', value: 28, color: '#10B981' },
  { name: 'علوم', value: 22, color: '#3B82F6' },
  { name: 'ادبیات', value: 19, color: '#8B5CF6' },
  { name: 'زبان خارجی', value: 16, color: '#F59E0B' },
  { name: 'علوم انسانی', value: 15, color: '#EC4899' },
];

export const CAPACITY_SUMMARY = [
  { label: 'کلاس‌های فعال', value: '۳۲', icon: 'book', color: '#10B981', bg: '#D1FAE5' },
  { label: 'مجموع دانش‌آموزان', value: '۱,۰۲۴', icon: 'users', color: '#3B82F6', bg: '#DBEAFE' },
  { label: 'میانگین ظرفیت کلاس', value: '۳۲ نفر', icon: 'capacity', color: '#8B5CF6', bg: '#EDE9FE' },
  { label: 'کلاس‌های پرظرفیت', value: '۵ (۱۶٪)', icon: 'alert', color: '#EF4444', bg: '#FEE2E2' },
  { label: 'کلاس‌های با ظرفیت عالی', value: '۲۷ (۸۴٪)', icon: 'check', color: '#10B981', bg: '#D1FAE5' },
];

export const CLASSES_TABLE = [
  { code: 'C-1101', name: 'ریاضی ۱۱/۱', level: 'یازدهم', avg: 85.2, teacher: 'آقای احمدی', attendance: 92 },
  { code: 'C-1202', name: 'فیزیک ۱۲/۲', level: 'دوازدهم', avg: 78.4, teacher: 'خانم رضایی', attendance: 88 },
  { code: 'C-1003', name: 'شیمی ۱۰/۳', level: 'دهم', avg: 81.0, teacher: 'آقای کریمی', attendance: 90 },
  { code: 'C-1104', name: 'ادبیات ۱۱/۲', level: 'یازدهم', avg: 74.5, teacher: 'خانم موسوی', attendance: 86 },
  { code: 'C-1201', name: 'زیست ۱۲/۱', level: 'دوازدهم', avg: 55.3, teacher: 'آقای نوری', attendance: 72 },
  { code: 'C-1001', name: 'زبان ۱۰/۱', level: 'دهم', avg: 88.7, teacher: 'خانم صادقی', attendance: 95 },
];

export const TOP_ATTENDANCE_CLASSES = [
  { rank: 1, name: 'ریاضی ۱۱/۱', rate: 96, medal: '🥇' },
  { rank: 2, name: 'زبان ۱۰/۱', rate: 94, medal: '🥈' },
  { rank: 3, name: 'فیزیک ۱۲/۲', rate: 91, medal: '🥉' },
];

export const CLASSES_NEEDING_ATTENTION = [
  { name: 'زیست ۱۲/۱', issue: 'میانگین نمره پایین (۵۵.۳)', variant: 'danger' },
  { name: 'تاریخ ۱۱/۳', issue: 'روند غیبت رو به افزایش', variant: 'warning' },
  { name: 'عربی ۱۰/۲', issue: 'حضور زیر ۷۰٪', variant: 'danger' },
];

export const RECENT_CLASS_ACTIVITIES = [
  { time: '۲ ساعت پیش', text: 'کلاس جدید علوم کامپیوتر ایجاد شد', icon: 'plus', color: '#10B981', bg: '#D1FAE5' },
  { time: '۵ ساعت پیش', text: 'نمرات ریاضی ۱۱/۱ به‌روزرسانی شد', icon: 'grade', color: '#3B82F6', bg: '#DBEAFE' },
  { time: 'دیروز', text: 'حضور و غیاب کلاس فیزیک ۱۲/۲ ثبت شد', icon: 'attendance', color: '#8B5CF6', bg: '#EDE9FE' },
  { time: '۲ روز پیش', text: 'معلم کلاس شیمی ۱۰/۳ تغییر کرد', icon: 'teacher', color: '#F59E0B', bg: '#FEF3C7' },
];

export const CLASSES_FOOTER_KPIS = [
  { title: 'کلاس‌های فعال', value: '۳۲', trend: '+۱ کلاس', icon: 'book', iconBg: '#D1FAE5', iconColor: '#10B981' },
  { title: 'مجموع دانش‌آموزان', value: '۱,۰۲۴', trend: '+۱۸ نفر', icon: 'users', iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { title: 'میانگین نمره کلاس‌ها', value: '۷۲.۶', trend: '+۳٪', icon: 'star', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { title: 'میانگین حضور', value: '۸۴٪', trend: '+۲٪', icon: 'clipboard', iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
];

export function getScoreColor(score) {
  if (score >= 90) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

export function formatAvg(score) {
  return score.toFixed(1).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
}

export function formatAttendance(rate) {
  return `${String(rate).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])}٪`;
}
