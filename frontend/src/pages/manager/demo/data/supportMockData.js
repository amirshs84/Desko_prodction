export const SUPPORT_CONTACT = {
  phone: {
    title: 'پشتیبانی تلفنی',
    numbers: ['۰۲۱-۱۲۳۴۵۶۷۸', '۰۲۱-۸۷۶۵۴۳۲۱'],
    note: 'شنبه تا چهارشنبه ۸ تا ۱۸',
  },
  email: {
    title: 'پشتیبانی ایمیل',
    address: 'support@hoshmandclass.com',
    note: 'پاسخ در کمتر از ۲۴ ساعت',
  },
  technical: {
    title: 'پشتیبانی فنی',
    number: '۰۲۱-۱۱۲۲۳۳۴۴',
    note: 'اختصاصی برای مسائل فنی و سیستمی',
  },
  address: {
    title: 'آدرس دفتر مرکزی',
    text: 'تهران، خیابان انقلاب، خیابان دانشگاه، پلاک ۱۲۳، طبقه ۴، واحد ۸',
  },
};

export const SUBJECT_OPTIONS = [
  'انتخاب موضوع',
  'مشکل فنی',
  'سوال درباره نمرات',
  'درخواست گزارش',
  'سایر موارد',
];

export const CATEGORY_OPTIONS = [
  'انتخاب دسته‌بندی',
  'نمرات',
  'کارنامه',
  'حساب کاربری',
  'آزمون‌ها',
  'گزارش‌ها',
];

export const RECENT_QUESTIONS = [
  {
    id: 1,
    subject: 'مشکل در ثبت نمرات دانش‌آموز',
    date: '۱۴۰۲/۰۲/۲۰',
    status: 'waiting',
    category: 'نمرات',
  },
  {
    id: 2,
    subject: 'درخواست صدور کارنامه',
    date: '۱۴۰۲/۰۲/۱۹',
    status: 'review',
    category: 'کارنامه',
  },
  {
    id: 3,
    subject: 'مشکل ورود به سیستم',
    date: '۱۴۰۲/۰۲/۱۸',
    status: 'answered',
    category: 'حساب کاربری',
  },
  {
    id: 4,
    subject: 'سوال درباره امتحانات پایان ترم',
    date: '۱۴۰۲/۰۲/۱۷',
    status: 'closed',
    category: 'آزمون‌ها',
  },
  {
    id: 5,
    subject: 'درخواست گزارش عملکرد کلاس',
    date: '۱۴۰۲/۰۲/۱۶',
    status: 'answered',
    category: 'گزارش‌ها',
  },
];

export const STATUS_CONFIG = {
  waiting: {
    label: 'در انتظار پاسخ',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: 'clock',
  },
  review: {
    label: 'در حال بررسی',
    color: '#2563EB',
    bg: '#DBEAFE',
    icon: 'dots',
  },
  answered: {
    label: 'پاسخ داده شده',
    color: '#059669',
    bg: '#D1FAE5',
    icon: 'check',
  },
  closed: {
    label: 'بسته شده',
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: 'check',
  },
};
