import {
  LayoutDashboard, Users, CalendarRange, BarChart3, Settings, ClipboardList,
} from 'lucide-react';

/** سایدبار دسکتاپ — از بالا به پایین */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'planning', label: 'برنامه‌ریزی', icon: ClipboardList },
  { id: 'analytics', label: 'گزارش‌ها', icon: BarChart3 },
  { id: 'settings', label: 'پروفایل', icon: Settings },
];

/**
 * نوار پایین موبایل — ترتیب فیزیکی چپ→راست (dir=ltr روی نوار):
 * پروفایل | گزارش‌ها | داشبورد | دانش‌آموزان | برنامه‌ریزی
 */
export const BOTTOM_NAV = [
  { id: 'settings', label: 'پروفایل', icon: Settings },
  { id: 'analytics', label: 'گزارش‌ها', icon: BarChart3 },
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'planning', label: 'برنامه‌ریزی', icon: CalendarRange },
];

export const BOTTOM_NAV_TAB_IDS = BOTTOM_NAV.map((t) => t.id);

export function resolveBottomNavActive(activeNav) {
  return BOTTOM_NAV_TAB_IDS.includes(activeNav) ? activeNav : null;
}

export const DEFAULT_TAB_ID = 'dashboard';

/** تب گروه‌ها از ناوبری مخفی است؛ رجیستری و کدش سر جایش مانده. */
export const HIDDEN_NAV_TAB_IDS = ['groups', 'history'];
