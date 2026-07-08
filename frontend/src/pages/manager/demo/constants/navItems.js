import {
  LayoutDashboard, Users, UserCheck, BookOpen, ClipboardCheck,
  FileText, BarChart2, Settings, Headphones, Bell, MessageSquare, BookMarked,
  LayoutGrid,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'teachers', label: 'معلمان', icon: UserCheck },
  { id: 'classes', label: 'کلاس‌ها', icon: BookOpen },
  { id: 'attendance', label: 'حضور و غیاب', icon: ClipboardCheck },
  { id: 'exams', label: 'آزمون‌ها', icon: FileText },
  { id: 'grades', label: 'نمرات', icon: BarChart2 },
  { id: 'reports', label: 'گزارش‌ها', icon: BookMarked },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
  { id: 'support', label: 'پشتیبانی', icon: Headphones },
];

/** آیتم‌های نوار پایین موبایل — id باید با TAB_REGISTRY هم‌نام باشد (به جز more) */
export const BOTTOM_NAV = [
  { id: 'more', label: 'بیشتر', icon: LayoutGrid },
  { id: 'reports', label: 'گزارش‌ها', icon: BarChart2 },
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'messages', label: 'پیام‌ها', icon: MessageSquare },
  { id: 'notifications', label: 'اعلان‌ها', icon: Bell },
];

/** تب‌هایی که مستقیم از نوار پایین قابل انتخاب‌اند */
export const BOTTOM_NAV_TAB_IDS = ['dashboard', 'reports', 'messages', 'notifications'];

export function resolveBottomNavActive(activeNav) {
  return BOTTOM_NAV_TAB_IDS.includes(activeNav) ? activeNav : 'more';
}

export const DEFAULT_TAB_ID = 'dashboard';
