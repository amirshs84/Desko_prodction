import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import CommandPalette from './components/CommandPalette';
import { ConsultantProvider, useConsultant } from './context/ConsultantContext';
import { resolveTab } from './tabRegistry';
import { resolveBottomNavActive } from './constants/navItems';
import { DEMO_FONT, PAGE_BG } from './constants/theme';

export default function ConsultantDashboardLayout() {
  return (
    <ConsultantProvider>
      <LayoutBody />
    </ConsultantProvider>
  );
}

function LayoutBody() {
  const {
    activeNav,
    setActiveNav,
    toggleMobileSidebar,
    closeMobileSidebar,
    desktopSidebarCollapsed,
    mobileSidebarOpen,
  } = useConsultant();

  const { Desktop: DesktopView, Mobile: MobileView } = resolveTab(activeNav);

  const handleNavigate = (id) => {
    setActiveNav(id);
    closeMobileSidebar();
  };

  const bottomNavActive = resolveBottomNavActive(activeNav);

  return (
    <div
      dir="rtl"
      className="h-dvh w-full overflow-hidden flex"
      style={{ fontFamily: DEMO_FONT, background: PAGE_BG }}
    >
      <div
        className="hidden lg:flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: desktopSidebarCollapsed ? 0 : 280,
          flexShrink: 0,
          opacity: desktopSidebarCollapsed ? 0 : 1,
        }}
      >
        <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobileSidebar} />
          <div
            className="absolute top-0 right-0 w-72 h-full flex flex-col z-10 shadow-xl"
            style={{ background: '#fff' }}
          >
            <Sidebar
              activeItem={activeNav}
              onNavigate={handleNavigate}
              onClose={closeMobileSidebar}
            />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-1 flex-col overflow-hidden min-w-0">
        <DesktopView />
      </div>

      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        <MobileView onMenuClick={toggleMobileSidebar} />
        <MobileBottomNav
          activeTab={bottomNavActive}
          onTabChange={(id) => {
            setActiveNav(id);
            closeMobileSidebar();
          }}
        />
      </div>

      <CommandPalette />
    </div>
  );
}
