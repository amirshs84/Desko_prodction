import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { StudentsRoster } from './students/StudentsRoster';

export function StudentsDesktop() {
  return (
    <DesktopPageShell title="دانش‌آموزان">
      <StudentsRoster />
    </DesktopPageShell>
  );
}

export function StudentsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <StudentsRoster />
    </MobilePageShell>
  );
}
