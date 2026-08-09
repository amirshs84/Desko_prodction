import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DEFAULT_TAB_ID } from '../constants/navItems';
import { consumeConsultantReturnTab } from '../lib/navigation';

const ConsultantContext = createContext(null);

export function ConsultantProvider({ children }) {
  const [activeNav, setActiveNav] = useState(() => consumeConsultantReturnTab(DEFAULT_TAB_ID));
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [planningSeed, setPlanningSeed] = useState(null);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarCollapsed((v) => !v);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((v) => !v);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const navigateToTab = useCallback((tabId, seed = null) => {
    if (seed?.groupId != null) setSelectedGroupId(seed.groupId);
    if (seed) setPlanningSeed(seed);
    setActiveNav(tabId);
    setMobileSidebarOpen(false);
  }, []);

  const clearPlanningSeed = useCallback(() => setPlanningSeed(null), []);

  const value = useMemo(
    () => ({
      activeNav,
      setActiveNav,
      desktopSidebarCollapsed,
      toggleDesktopSidebar,
      mobileSidebarOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      selectedGroupId,
      setSelectedGroupId,
      planningSeed,
      clearPlanningSeed,
      navigateToTab,
    }),
    [
      activeNav,
      desktopSidebarCollapsed,
      toggleDesktopSidebar,
      mobileSidebarOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      selectedGroupId,
      planningSeed,
      clearPlanningSeed,
      navigateToTab,
    ],
  );

  return (
    <ConsultantContext.Provider value={value}>
      {children}
    </ConsultantContext.Provider>
  );
}

export function useConsultant() {
  const ctx = useContext(ConsultantContext);
  if (!ctx) throw new Error('useConsultant must be used within ConsultantProvider');
  return ctx;
}

/** روی صفحه پروفایل دانش‌آموز Provider نیست — null برمی‌گردد. */
export function useOptionalConsultant() {
  return useContext(ConsultantContext);
}
