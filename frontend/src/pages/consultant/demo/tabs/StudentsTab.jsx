import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import StudentsDesktopView from './students/StudentsDesktopView';
import StudentsMobileView from './students/StudentsMobileView';

export function StudentsDesktop() {
  return (
    <DesktopPageShell>
      <StudentsDesktopView />
    </DesktopPageShell>
  );
}

export function StudentsMobile() {
  return (
    <MobilePageShell hideHeader>
      <StudentsMobileView />
    </MobilePageShell>
  );
}
