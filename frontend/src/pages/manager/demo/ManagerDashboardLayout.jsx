import { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import { ManagerDashboardProvider, useManagerDashboard } from './context/ManagerDashboardContext';
import { resolveTab } from './tabRegistry';
import { DEFAULT_TAB_ID, resolveBottomNavActive } from './constants/navItems';
import { DEMO_FONT, PAGE_BG } from './constants/theme';

export default function ManagerDashboardLayout() {
  const [activeNav, setActiveNav] = useState(DEFAULT_TAB_ID);

  const { Desktop: DesktopView, Mobile: MobileView } = resolveTab(activeNav);

  return (
    <ManagerDashboardProvider onNavigate={setActiveNav}>
      <LayoutBody
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        DesktopView={DesktopView}
        MobileView={MobileView}
      />
    </ManagerDashboardProvider>
  );
}

function LayoutBody({ activeNav, setActiveNav, DesktopView, MobileView }) {
  const { toggleMobileSidebar, closeMobileSidebar } = useManagerDashboard();

  const handleNavigate = (id) => {
    setActiveNav(id);
    closeMobileSidebar();
  };

  const handleBottomNavChange = (id) => {
    if (id === 'more') {
      toggleMobileSidebar();
      return;
    }
    setActiveNav(id);
    closeMobileSidebar();
  };

  const bottomNavActive = resolveBottomNavActive(activeNav);

  return (
    <div
      dir="rtl"
      className="h-screen w-full overflow-hidden flex"
      style={{ fontFamily: DEMO_FONT, background: PAGE_BG }}
    >
      <DesktopSidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      <MobileSidebar activeNav={activeNav} handleNavigate={handleNavigate} />

      <div className="hidden lg:flex flex-1 flex-col overflow-hidden min-w-0">
        <DesktopView />
      </div>

      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        <MobileView onMenuClick={toggleMobileSidebar} />
        <MobileBottomNav activeTab={bottomNavActive} onTabChange={handleBottomNavChange} />
      </div>
    </div>
  );
}

function DesktopSidebar({ activeNav, setActiveNav }) {
  const { desktopSidebarCollapsed } = useManagerDashboard();

  return (
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
  );
}

function MobileSidebar({ activeNav, handleNavigate }) {
  const { mobileSidebarOpen, closeMobileSidebar } = useManagerDashboard();

  if (!mobileSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={closeMobileSidebar} />
      <div
        className="absolute top-0 right-0 w-72 h-full flex flex-col z-10 shadow-xl"
        style={{ background: '#fff' }}
      >
        <Sidebar activeItem={activeNav} onNavigate={handleNavigate} onClose={closeMobileSidebar} />
      </div>
    </div>
  );
}
