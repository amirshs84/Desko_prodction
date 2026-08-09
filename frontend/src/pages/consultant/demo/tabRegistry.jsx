import { lazy, Suspense } from 'react';
import { DashboardDesktop, DashboardMobile } from './tabs/DashboardTab';
import { StudentsDesktop, StudentsMobile } from './tabs/StudentsTab';
import { GroupsDesktop, GroupsMobile } from './tabs/GroupsTab';
import { PlanningDesktop, PlanningMobile } from './tabs/PlanningTab';
import { SettingsDesktop, SettingsMobile } from './tabs/SettingsTab';
import { DEFAULT_TAB_ID } from './constants/navItems';

const AnalyticsDesktopLazy = lazy(() =>
  import('./tabs/AnalyticsHubTab').then((m) => ({ default: m.AnalyticsDesktop })),
);
const AnalyticsMobileLazy = lazy(() =>
  import('./tabs/AnalyticsHubTab').then((m) => ({ default: m.AnalyticsMobile })),
);

function withSuspense(LazyComp) {
  return function SuspendedTab(props) {
    return (
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-sm text-emerald-700/70 animate-pulse">
            در حال آماده‌سازی گزارش‌ها…
          </div>
        }
      >
        <LazyComp {...props} />
      </Suspense>
    );
  };
}

const AnalyticsDesktop = withSuspense(AnalyticsDesktopLazy);
const AnalyticsMobile = withSuspense(AnalyticsMobileLazy);

export const TAB_REGISTRY = {
  dashboard: { Desktop: DashboardDesktop, Mobile: DashboardMobile },
  students: { Desktop: StudentsDesktop, Mobile: StudentsMobile },
  groups: { Desktop: GroupsDesktop, Mobile: GroupsMobile },
  planning: { Desktop: PlanningDesktop, Mobile: PlanningMobile },
  analytics: { Desktop: AnalyticsDesktop, Mobile: AnalyticsMobile },
  /** سازگاری با لینک‌های قدیمی تاریخچه */
  history: { Desktop: AnalyticsDesktop, Mobile: AnalyticsMobile },
  settings: { Desktop: SettingsDesktop, Mobile: SettingsMobile },
};

export function resolveTab(tabId) {
  return TAB_REGISTRY[tabId] ?? TAB_REGISTRY[DEFAULT_TAB_ID];
}
