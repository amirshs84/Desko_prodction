import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import DashboardDesktopView from './dashboard/DashboardDesktop';
import DashboardMobileView from './dashboard/DashboardMobile';

export function DashboardDesktop() {
  return (
    <DesktopPageShell>
      <DashboardDesktopView />
    </DesktopPageShell>
  );
}

export function DashboardMobile() {
  return (
    <MobilePageShell hideHeader>
      <DashboardMobileView />
    </MobilePageShell>
  );
}
