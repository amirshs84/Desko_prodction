import {
  LayoutDashboard, Users, UsersRound, CalendarRange, History,
  Settings, LayoutGrid, ClipboardList,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'groups', label: 'گروه‌ها', icon: UsersRound },
  { id: 'planning', label: 'برنامه‌ریزی گروهی', icon: ClipboardList },
  { id: 'history', label: 'تاریخچه', icon: History },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
];

export const BOTTOM_NAV = [
  { id: 'more', label: 'بیشتر', icon: LayoutGrid },
  { id: 'students', label: 'دانش‌آموزان', icon: Users },
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'planning', label: 'برنامه', icon: CalendarRange },
];

export const BOTTOM_NAV_TAB_IDS = ['dashboard', 'students', 'planning'];

export function resolveBottomNavActive(activeNav) {
  return BOTTOM_NAV_TAB_IDS.includes(activeNav) ? activeNav : 'more';
}

export const DEFAULT_TAB_ID = 'dashboard';
