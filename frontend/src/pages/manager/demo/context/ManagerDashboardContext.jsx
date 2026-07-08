import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  ACADEMIC_YEARS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MESSAGES,
} from '../data/headerMockData';

const ManagerDashboardContext = createContext(null);

export function ManagerDashboardProvider({ children, onNavigate }) {
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [activePanel, setActivePanel] = useState(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

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

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  }, []);

  const markAllMessagesRead = useCallback(() => {
    setMessages((prev) => prev.map((m) => ({ ...m, unread: false })));
  }, []);

  const markMessageRead = useCallback((id) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, unread: false } : m)),
    );
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  const unreadMessageCount = useMemo(
    () => messages.filter((m) => m.unread).length,
    [messages],
  );

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
      markAllNotificationsRead,
      markNotificationRead,
      unreadNotificationCount,
      messages,
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
      markAllNotificationsRead,
      markNotificationRead,
      unreadNotificationCount,
      messages,
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
