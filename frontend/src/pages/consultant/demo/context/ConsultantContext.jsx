import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ConsultantContext = createContext(null);

export function ConsultantProvider({ children, onNavigate }) {
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
    onNavigate?.(tabId);
    setMobileSidebarOpen(false);
  }, [onNavigate]);

  const clearPlanningSeed = useCallback(() => setPlanningSeed(null), []);

  const value = useMemo(
    () => ({
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
