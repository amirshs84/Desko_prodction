import {
  Home, Users, CalendarDays, BarChart3, UserRound,
} from 'lucide-react';

/** سایدبار دسکتاپ — راست به چپ، از بالا به پایین */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'داشبورد', icon: Home },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'planning', label: 'برنامه‌ریزی', icon: CalendarDays },
  { id: 'analytics', label: 'گزارش‌ها', icon: BarChart3 },
  { id: 'settings', label: 'پروفایل', icon: UserRound },
];

/**
 * نوار پایین موبایل — ترتیب DOM در dir=rtl از راست به چپ:
 * مشاوره | دانش‌آموزان | برنامه‌ریزی | گزارش‌ها | پروفایل
 */
export const BOTTOM_NAV = [
  { id: 'dashboard', label: 'مشاوره', icon: Home },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'planning', label: 'برنامه‌ریزی', icon: CalendarDays },
  { id: 'analytics', label: 'گزارش‌ها', icon: BarChart3 },
  { id: 'settings', label: 'پروفایل', icon: UserRound },
];

export const BOTTOM_NAV_TAB_IDS = BOTTOM_NAV.map((t) => t.id);

export function resolveBottomNavActive(activeNav) {
  return BOTTOM_NAV_TAB_IDS.includes(activeNav) ? activeNav : null;
}

export const DEFAULT_TAB_ID = 'dashboard';

/** تب‌هایی که در طرح جدید منوی اصلی نیستند؛ رجیستری‌شان سر جایش مانده. */
export const HIDDEN_NAV_TAB_IDS = ['groups', 'history', 'exams'];
