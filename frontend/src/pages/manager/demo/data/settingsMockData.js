export const SETTINGS_SECTIONS = [
  { id: 'general', label: 'عمومی', icon: 'school' },
  { id: 'academic', label: 'سال تحصیلی', icon: 'calendar' },
  { id: 'notifications', label: 'اعلان‌ها', icon: 'bell' },
  { id: 'security', label: 'امنیت', icon: 'shield' },
  { id: 'system', label: 'سیستم', icon: 'sliders' },
];

export const DEFAULT_SCHOOL_INFO = {
  name: 'مدرسه هوشمند نمونه',
  phone: '۰۲۱-۱۲۳۴۵۶۷۸',
  email: 'info@hoshmandclass.com',
  address: 'تهران، خیابان انقلاب، پلاک ۱۲۳',
};

export const ACADEMIC_YEARS = [
  '۱۴۰۴-۱۴۰۵',
  '۱۴۰۳-۱۴۰۴',
  '۱۴۰۲-۱۴۰۳',
];

export const NOTIFICATION_SETTINGS = [
  { id: 'attendance', label: 'هشدار غیبت دانش‌آموز', desc: 'اطلاع‌رسانی فوری در صورت غیبت غیرموجه' },
  { id: 'grades', label: 'انتشار نمرات', desc: 'اعلان به والدین پس از ثبت نمرات جدید' },
  { id: 'exams', label: 'یادآوری آزمون', desc: '۲۴ ساعت قبل از برگزاری آزمون' },
  { id: 'messages', label: 'پیام‌های جدید', desc: 'پیام‌های معلمان و اولیا' },
  { id: 'reports', label: 'گزارش‌های دوره‌ای', desc: 'ارسال گزارش هفتگی عملکرد مدرسه' },
];

export const DEFAULT_NOTIFICATIONS = {
  attendance: true,
  grades: true,
  exams: true,
  messages: false,
  reports: true,
};

export const SYSTEM_OPTIONS = {
  languages: ['فارسی', 'English'],
  dateFormats: ['شمسی (۱۴۰۴/۰۳/۲۷)', 'میلادی (2025-06-17)'],
  timezones: ['Asia/Tehran (UTC+3:30)', 'UTC'],
};

export const DEFAULT_SYSTEM = {
  language: 'فارسی',
  dateFormat: 'شمسی (۱۴۰۴/۰۳/۲۷)',
  timezone: 'Asia/Tehran (UTC+3:30)',
  compactMode: false,
};
