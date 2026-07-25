import {
  LayoutDashboard, Users, UsersRound, CalendarRange, History,
  Settings, ClipboardList,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'groups', label: 'گروه‌ها', icon: UsersRound },
  { id: 'planning', label: 'برنامه‌ریزی گروهی', icon: ClipboardList },
  { id: 'history', label: 'تاریخچه', icon: History },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
];

/** ترتیب فیزیکی از چپ به راست (dir=ltr روی نوار پایین) */
export const BOTTOM_NAV = [
  { id: 'settings', label: 'تنظیمات', icon: Settings },
  { id: 'groups', label: 'گروه‌ها', icon: UsersRound },
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'planning', label: 'برنامه', icon: CalendarRange },
];

export const BOTTOM_NAV_TAB_IDS = BOTTOM_NAV.map((t) => t.id);

export function resolveBottomNavActive(activeNav) {
  return BOTTOM_NAV_TAB_IDS.includes(activeNav) ? activeNav : null;
}

export const DEFAULT_TAB_ID = 'dashboard';
