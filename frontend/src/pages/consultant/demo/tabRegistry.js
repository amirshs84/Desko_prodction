import { DashboardDesktop, DashboardMobile } from './tabs/DashboardTab';
import { StudentsDesktop, StudentsMobile } from './tabs/StudentsTab';
import { GroupsDesktop, GroupsMobile } from './tabs/GroupsTab';
import { PlanningDesktop, PlanningMobile } from './tabs/PlanningTab';
import { HistoryDesktop, HistoryMobile } from './tabs/HistoryTab';
import { SettingsDesktop, SettingsMobile } from './tabs/SettingsTab';
import { DEFAULT_TAB_ID } from './constants/navItems';

export const TAB_REGISTRY = {
  dashboard: { Desktop: DashboardDesktop, Mobile: DashboardMobile },
  students: { Desktop: StudentsDesktop, Mobile: StudentsMobile },
  groups: { Desktop: GroupsDesktop, Mobile: GroupsMobile },
  planning: { Desktop: PlanningDesktop, Mobile: PlanningMobile },
  history: { Desktop: HistoryDesktop, Mobile: HistoryMobile },
  settings: { Desktop: SettingsDesktop, Mobile: SettingsMobile },
};

export function resolveTab(tabId) {
  return TAB_REGISTRY[tabId] ?? TAB_REGISTRY[DEFAULT_TAB_ID];
}
