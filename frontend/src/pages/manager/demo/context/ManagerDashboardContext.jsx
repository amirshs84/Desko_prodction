import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ACADEMIC_YEARS } from '../data/headerMockData';
import { useManagerNotifications } from '../hooks/useManagerNotifications';
import { useManagerTicketsInbox } from '../hooks/useManagerTickets';

const ManagerDashboardContext = createContext(null);

export function ManagerDashboardProvider({ children, onNavigate }) {
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [activePanel, setActivePanel] = useState(null);

  const {
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    loading: notificationsLoading,
  } = useManagerNotifications();

  const {
    recentMessages: messages,
    unreadMessageCount,
    markMessageRead,
    markAllMessagesRead,
    loading: messagesLoading,
  } = useManagerTicketsInbox();

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarCollapsed((v) => !v);
    setActivePanel(null);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((v) => !v);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const togglePanel = useCallback((panelId) => {
    setActivePanel((current) => (current === panelId ? null : panelId));
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const selectAcademicYear = useCallback((year) => {
    setAcademicYear(year);
    setActivePanel(null);
  }, []);

  const goToSettings = useCallback(() => {
    onNavigate?.('settings');
    setActivePanel(null);
    setMobileSidebarOpen(false);
  }, [onNavigate]);

  const navigateToTab = useCallback((tabId) => {
    onNavigate?.(tabId);
    setActivePanel(null);
    setMobileSidebarOpen(false);
  }, [onNavigate]);

  const value = useMemo(
    () => ({
      desktopSidebarCollapsed,
      toggleDesktopSidebar,
      mobileSidebarOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      academicYear,
      selectAcademicYear,
      academicYears: ACADEMIC_YEARS,
      activePanel,
      togglePanel,
      closePanel,
      notifications,
      notificationsLoading,
      markAllNotificationsRead,
      markNotificationRead,
      unreadNotificationCount,
      messages,
      messagesLoading,
      markAllMessagesRead,
      markMessageRead,
      unreadMessageCount,
      goToSettings,
      navigateToTab,
    }),
    [
      desktopSidebarCollapsed,
      toggleDesktopSidebar,
      mobileSidebarOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      academicYear,
      selectAcademicYear,
      activePanel,
      togglePanel,
      closePanel,
      notifications,
      notificationsLoading,
      markAllNotificationsRead,
      markNotificationRead,
      unreadNotificationCount,
      messages,
      messagesLoading,
      markAllMessagesRead,
      markMessageRead,
      unreadMessageCount,
      goToSettings,
      navigateToTab,
    ],
  );

  return (
    <ManagerDashboardContext.Provider value={value}>
      {children}
    </ManagerDashboardContext.Provider>
  );
}

export function useManagerDashboard() {
  const ctx = useContext(ManagerDashboardContext);
  if (!ctx) {
    throw new Error('useManagerDashboard must be used within ManagerDashboardProvider');
  }
  return ctx;
}
