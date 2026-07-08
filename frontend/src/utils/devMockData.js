/** دادهٔ نمونه برای پیش‌نمایش UI داشبورد در حالت dev */

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 5), 30, 0, 0);
  return d.toISOString();
};

export const DEV_MOCK_COURSES = [
  { id: 1, name: 'ریاضی', color_code: '#3b82f6' },
  { id: 2, name: 'فیزیک', color_code: '#8b5cf6' },
  { id: 3, name: 'شیمی', color_code: '#10b981' },
  { id: 4, name: 'ادبیات', color_code: '#f59e0b' },
];

export const DEV_MOCK_SESSIONS = [
  { id: 1, subject_name: 'ریاضی', duration_seconds: 5400, start_time: daysAgo(1), description: 'فصل مشتق' },
  { id: 2, subject_name: 'فیزیک', duration_seconds: 3600, start_time: daysAgo(2), description: 'حرکت‌شناسی' },
  { id: 3, subject_name: 'شیمی', duration_seconds: 2700, start_time: daysAgo(3), description: 'استوکیومتری' },
  { id: 4, subject_name: 'ریاضی', duration_seconds: 7200, start_time: daysAgo(5), description: 'انتگرال' },
  { id: 5, subject_name: 'ادبیات', duration_seconds: 1800, start_time: daysAgo(7), description: 'آراء و اندیشه' },
  { id: 6, subject_name: 'فیزیک', duration_seconds: 4500, start_time: daysAgo(10), description: 'الکتریسیته' },
  { id: 7, subject_name: 'شیمی', duration_seconds: 3300, start_time: daysAgo(14), description: 'ترمودینامیک' },
  { id: 8, subject_name: 'ریاضی', duration_seconds: 6000, start_time: daysAgo(21), description: 'حد و پیوستگی' },
  { id: 9, subject_name: 'ادبیات', duration_seconds: 2400, start_time: daysAgo(30), description: 'نثر معاصر' },
  { id: 10, subject_name: 'فیزیک', duration_seconds: 3900, start_time: daysAgo(45), description: 'نور و موج' },
  { id: 11, subject_name: 'ریاضی', duration_seconds: 4800, start_time: daysAgo(60), description: 'احتمال' },
  { id: 12, subject_name: 'شیمی', duration_seconds: 2100, start_time: daysAgo(75), description: 'جدول تناوبی' },
];
