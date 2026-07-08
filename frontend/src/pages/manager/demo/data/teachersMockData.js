export const TEACHER_PERFORMANCE_BARS = [
  { name: 'ریاضی', score: 4.6, color: '#10B981', label: '۴.۶' },
  { name: 'فیزیک', score: 4.3, color: '#10B981', label: '۴.۳' },
  { name: 'ادبیات', score: 4.1, color: '#F59E0B', label: '۴.۱' },
  { name: 'زبان', score: 4.5, color: '#10B981', label: '۴.۵' },
  { name: 'زیست', score: 3.8, color: '#F59E0B', label: '۳.۸' },
  { name: 'شیمی', score: 3.5, color: '#EF4444', label: '۳.۵' },
];

export const SUBJECT_TEACHER_DISTRIBUTION = [
  { name: 'ریاضی', value: 22, color: '#10B981' },
  { name: 'علوم', value: 18, color: '#3B82F6' },
  { name: 'ادبیات', value: 16, color: '#8B5CF6' },
  { name: 'زبان', value: 14, color: '#F59E0B' },
  { name: 'علوم انسانی', value: 30, color: '#EC4899' },
];

export const WORKFORCE_SUMMARY = [
  { label: 'معلمان فعال', value: '۳۳', icon: 'active', color: '#10B981', bg: '#D1FAE5' },
  { label: 'میانگین سابقه تدریس', value: '۸ سال', icon: 'experience', color: '#3B82F6', bg: '#DBEAFE' },
  { label: 'میانگین کلاس هر معلم', value: '۳ کلاس', icon: 'classes', color: '#8B5CF6', bg: '#EDE9FE' },
  { label: 'معلمان با ارزیابی عالی', value: '۲۴ (۷۳٪)', icon: 'excellent', color: '#10B981', bg: '#D1FAE5' },
  { label: 'نیازمند پیگیری', value: '۳ (۹٪)', icon: 'alert', color: '#EF4444', bg: '#FEE2E2' },
];

export const TEACHERS_TABLE = [
  { code: 'T-001', name: 'آقای احمدی', subject: 'ریاضی', classes: 4, students: 128, rating: 4.8, attendance: 96 },
  { code: 'T-002', name: 'خانم رضایی', subject: 'فیزیک', classes: 3, students: 96, rating: 4.5, attendance: 92 },
  { code: 'T-003', name: 'آقای کریمی', subject: 'شیمی', classes: 3, students: 94, rating: 4.2, attendance: 90 },
  { code: 'T-004', name: 'خانم موسوی', subject: 'ادبیات', classes: 2, students: 64, rating: 3.6, attendance: 85 },
  { code: 'T-005', name: 'آقای نوری', subject: 'زیست', classes: 3, students: 92, rating: 3.4, attendance: 78 },
  { code: 'T-006', name: 'خانم صادقی', subject: 'زبان انگلیسی', classes: 4, students: 130, rating: 4.7, attendance: 97 },
];

export const TOP_TEACHERS = [
  { rank: 1, name: 'آقای احمدی', subject: 'ریاضی', rating: 4.9, medal: '🥇' },
  { rank: 2, name: 'خانم صادقی', subject: 'زبان انگلیسی', rating: 4.8, medal: '🥈' },
  { rank: 3, name: 'آقای کریمی', subject: 'شیمی', rating: 4.7, medal: '🥉' },
];

export const TEACHERS_NEEDING_ATTENTION = [
  { name: 'آقای نوری', issue: 'نرخ حضور پایین (۷۸٪)', variant: 'danger' },
  { name: 'خانم موسوی', issue: 'ارزیابی عملکرد زیر ۳.۵', variant: 'warning' },
  { name: 'آقای رحیمی', issue: '۳ کلاس بدون ثبت نمره فصل جاری', variant: 'warning' },
];

export const RECENT_TEACHER_ACTIVITIES = [
  { time: '۱ ساعت پیش', text: 'معلم جدید (خانم فرهادی) به تیم علوم اضافه شد', icon: 'plus', color: '#10B981', bg: '#D1FAE5' },
  { time: '۳ ساعت پیش', text: 'ارزیابی فصل اول آقای احمدی ثبت شد', icon: 'grade', color: '#3B82F6', bg: '#DBEAFE' },
  { time: 'دیروز', text: 'برنامه تدریس خانم رضایی به‌روزرسانی شد', icon: 'schedule', color: '#8B5CF6', bg: '#EDE9FE' },
  { time: '۲ روز پیش', text: 'گزارش حضور معلمان هفته گذشته صادر شد', icon: 'attendance', color: '#F59E0B', bg: '#FEF3C7' },
];

export const TEACHERS_FOOTER_KPIS = [
  { title: 'معلمان فعال', value: '۳۳', trend: '+۲ نفر', icon: 'teacher', iconBg: '#D1FAE5', iconColor: '#10B981' },
  { title: 'کلاس‌های تحت پوشش', value: '۸۶', trend: '+۴ کلاس', icon: 'book', iconBg: '#DBEAFE', iconColor: '#3B82F6' },
  { title: 'میانگین ارزیابی', value: '۴.۲/۵', trend: '+۰.۳', icon: 'star', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { title: 'میانگین حضور معلمان', value: '۹۴٪', trend: '+۱٪', icon: 'clipboard', iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
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
