import TopHeaderBar from './TopHeaderBar';
import MobileHeader from './MobileHeader';
import { useConsultant } from '../context/ConsultantContext';
import { PAGE_BG, MOBILE_SCROLL_PADDING } from '../constants/theme';

export function DesktopPageShell({ title, children }) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: PAGE_BG }}>
      <TopHeaderBar title={title} />
      {children}
    </div>
  );
}

export function MobilePageShell({ onMenuClick, children, hideHeader = false }) {
  const { mobileSidebarOpen, toggleMobileSidebar } = useConsultant();

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: PAGE_BG, paddingBottom: MOBILE_SCROLL_PADDING }}
    >
      {hideHeader ? null : (
        <MobileHeader
          onMenuClick={onMenuClick ?? toggleMobileSidebar}
          sidebarOpen={mobileSidebarOpen}
        />
      )}
      {children}
    </div>
  );
}
