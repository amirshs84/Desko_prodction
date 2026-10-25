import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../demo/components/Sidebar';
import MobileBottomNav from '../demo/components/MobileBottomNav';
import CommandPalette from '../demo/components/CommandPalette';
import { DesktopPageShell, MobilePageShell } from '../demo/components/PageShells';
import { ConsultantProvider, useConsultant } from '../demo/context/ConsultantContext';
import { PANEL, DEMO_FONT, PAGE_BG, SIDEBAR_EXPANDED, SIDEBAR_RAIL } from '../demo/constants/theme';
import {
  useConsultantStudents,
  useCounselingSessionMutations,
  useCounselingSessions,
} from '../demo/hooks/useConsultantQueries';
import { presentSession } from '../demo/lib/counselingSessions';
import { rememberConsultantTab } from '../demo/lib/navigation';
import { todayJalali } from '../../../calendar/lib/jalaliUtils';
import { calPathWeek, setCalendarBase } from '../../../calendar/lib/paths';
import { DESIGN_TABS, profileTabFromPath, useStudentDossier } from './dossier/dossierModel';
import {
  DossierHero,
  DossierList,
  DossierNotice,
  DossierOverview,
  DossierStack,
  DossierStats,
  DossierTabs,
} from './dossier/dossierPieces';
import { CalendarTab } from './tabs/CalendarTab';
import { ActualCalendarTab } from './tabs/ActualCalendarTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { InteractionsTab } from './tabs/InteractionsTab';
import { IdentityTab } from './tabs/IdentityTab';

function ProfileTools({ dossier }) {
  const userId = dossier.userId;
  if (dossier.tab === 'calendar') {
    return (
      <div className="min-h-[70vh] lg:h-[calc(100dvh-240px)] lg:overflow-hidden rounded-[22px] border border-[#E5EEE9] bg-white">
        <CalendarTab userId={userId} />
      </div>
    );
  }
  if (dossier.tab === 'actual-calendar') return <ActualCalendarTab userId={userId} />;
  if (dossier.tab === 'analytics') return <AnalyticsTab userId={userId} />;
  if (dossier.tab === 'interactions') return <InteractionsTab userId={userId} />;
  if (dossier.tab === 'identity') return <IdentityTab student={dossier.identityStudent} userId={userId} />;
  return null;
}

function DossierBody({ dossier, onBack, stacked, active }) {
  const designTab = DESIGN_TABS.has(dossier.tab);
  return (
    <div className={`px-4 sm:px-6 pb-8 flex flex-col gap-3 min-w-0 ${stacked ? 'max-w-3xl mx-auto w-full' : ''}`}>
      <DossierNotice notice={dossier.notice} />
      <DossierHero dossier={dossier} onBack={stacked ? null : onBack} />
      <DossierStats dossier={dossier} columns={stacked ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'} />
      <DossierTabs dossier={dossier} />
      {dossier.tab === 'overview'
        ? (stacked ? <DossierStack dossier={dossier} /> : <DossierOverview dossier={dossier} />)
        : designTab
          ? <DossierList dossier={dossier} />
          : (active ? <ProfileTools dossier={dossier} /> : null)}
    </div>
  );
}

function ProfileDesktop({ dossier, onBack, active }) {
  return (
    <DesktopPageShell>
      <DossierBody dossier={dossier} onBack={onBack} stacked={false} active={active} />
    </DesktopPageShell>
  );
}

function ProfileMobile({ dossier, onBack, onMenuClick, active }) {
  return (
    <MobilePageShell hideHeader>
      <div className="px-4 sm:px-6 pt-3 max-w-3xl mx-auto w-full">
        <header className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="relative h-10 px-3 rounded-xl text-sm font-bold"
            style={{ color: PANEL.green }}
          >
            بازگشت
          </button>
          <h1 className="relative text-[15px] font-extrabold truncate" style={{ color: PANEL.ink }}>
            پروفایل دانش‌آموز
          </h1>
          <button
            type="button"
            aria-label="باز کردن منو"
            onClick={onMenuClick}
            className="relative w-10 h-10 rounded-xl inline-flex items-center justify-center"
            style={{ color: PANEL.ink }}
          >
            <Menu size={22} />
          </button>
        </header>
      </div>
      <DossierBody dossier={dossier} stacked active={active} />
    </MobilePageShell>
  );
}

function useDesktopLayout() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

function ProfileShell({ onLeave, dossier }) {
  const {
    desktopSidebarCollapsed,
    toggleMobileSidebar,
    closeMobileSidebar,
    mobileSidebarOpen,
  } = useConsultant();
  const desktop = useDesktopLayout();

  const back = () => onLeave(null);

  return (
    <div
      dir="rtl"
      className="h-dvh w-full overflow-hidden flex"
      style={{ fontFamily: DEMO_FONT, background: PAGE_BG }}
    >
      <div
        className="hidden lg:flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: desktopSidebarCollapsed ? SIDEBAR_RAIL : SIDEBAR_EXPANDED, flexShrink: 0 }}
      >
        <Sidebar activeItem="students" onNavigate={onLeave} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobileSidebar} />
          <div className="absolute top-0 right-0 w-72 h-full flex flex-col z-10 shadow-xl bg-white">
            <Sidebar activeItem="students" onNavigate={onLeave} onClose={closeMobileSidebar} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-1 flex-col overflow-hidden min-w-0">
        <ProfileDesktop dossier={dossier} onBack={back} active={desktop} />
      </div>
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden min-w-0">
        <ProfileMobile dossier={dossier} onBack={back} onMenuClick={toggleMobileSidebar} active={!desktop} />
        <MobileBottomNav activeTab="students" onTabChange={onLeave} />
      </div>
      <CommandPalette />
    </div>
  );
}

export default function StudentProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: liveStudents } = useConsultantStudents();
  const dossierState = useStudentDossier(userId, liveStudents);
  const numericStudentId = /^\d+$/.test(String(userId || '')) ? Number(userId) : null;
  const liveSessions = useCounselingSessions(
    { student: numericStudentId || 0 },
    { enabled: numericStudentId != null },
  );
  const sessionActions = useCounselingSessionMutations();
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionWhen, setSessionWhen] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [designTab, setDesignTab] = useState('overview');
  const routeTab = profileTabFromPath(location.pathname, userId);

  useLayoutEffect(() => {
    setCalendarBase(`/consultant/student/${userId}/calendar`);
    return () => setCalendarBase('/calendar');
  }, [userId]);

  useEffect(() => {
    setDesignTab('overview');
  }, [userId]);

  useEffect(() => {
    const base = `/consultant/student/${userId}`;
    if (location.pathname === `${base}/messages` || location.pathname === `${base}/messages/`) {
      navigate(`${base}/interactions`, { replace: true });
    }
  }, [location.pathname, navigate, userId]);

  const selectTab = useCallback((id) => {
    const base = `/consultant/student/${userId}`;
    if (id === 'calendar') {
      setCalendarBase(`${base}/calendar`);
      const today = todayJalali();
      navigate(calPathWeek(today.jy, today.jm, today.jd));
      return;
    }
    if (id === 'actual-calendar' || id === 'analytics' || id === 'interactions' || id === 'identity') {
      navigate(`${base}/${id}`);
      return;
    }
    setDesignTab(id);
    if (location.pathname !== base && location.pathname !== `${base}/`) {
      navigate(base);
    }
  }, [location.pathname, navigate, userId]);

  const visibleTab = routeTab || designTab;
  const live = (liveStudents || []).find((item) => String(item.user_id) === String(userId));

  const saveSession = async () => {
    if (numericStudentId == null) return;
    if (!sessionTitle.trim()) {
      setSessionError('موضوع جلسه را بنویسید');
      return;
    }
    if (!sessionWhen) {
      setSessionError('زمان جلسه را انتخاب کنید');
      return;
    }
    setSessionError('');
    try {
      await sessionActions.createSession.mutateAsync({
        student_id: numericStudentId,
        title: sessionTitle.trim(),
        starts_at: new Date(sessionWhen).toISOString(),
      });
      setSessionTitle('');
      setSessionWhen('');
    } catch (err) {
      setSessionError(err?.response?.data?.error?.message || 'ثبت جلسه ناموفق بود');
    }
  };

  const changeSessionStatus = async (id, status) => {
    setSessionError('');
    try {
      await sessionActions.updateSession.mutateAsync({ id, status });
    } catch (err) {
      setSessionError(err?.response?.data?.error?.message || 'تغییر وضعیت جلسه ناموفق بود');
    }
  };

  const removeSession = async (id) => {
    setSessionError('');
    try {
      await sessionActions.deleteSession.mutateAsync(id);
    } catch (err) {
      setSessionError(err?.response?.data?.error?.message || 'حذف جلسه ناموفق بود');
    }
  };

  const dossierBase = useMemo(() => ({
    ...dossierState,
    tab: visibleTab,
    setTab: selectTab,
    list: DESIGN_TABS.has(visibleTab) ? (dossierState[visibleTab] || []) : [],
    userId,
    identityStudent: live || {
      full_name: dossierState.displayName,
      user_id: userId,
      phone_number: dossierState.phone,
      grade_label: dossierState.grade,
      olympiad_field: dossierState.track,
      class_names: dossierState.school ? [dossierState.school] : [],
      groups: [],
    },
  }), [designTab, dossierState, live, routeTab, selectTab, userId, visibleTab]);

  const dossier = {
    ...dossierBase,
    list: visibleTab === 'sessions' && numericStudentId != null
      ? (liveSessions.data || []).map(presentSession)
      : dossierBase.list,
    sessionApi: numericStudentId == null ? null : {
      title: sessionTitle,
      setTitle: setSessionTitle,
      when: sessionWhen,
      setWhen: setSessionWhen,
      save: saveSession,
      saving: sessionActions.createSession.isPending,
      error: sessionError,
      loading: liveSessions.isLoading && !liveSessions.isFetched,
      failed: liveSessions.isError && !liveSessions.data,
      refetch: liveSessions.refetch,
      changeStatus: changeSessionStatus,
      remove: removeSession,
    },
  };

  const leave = useCallback((tabId) => {
    if (tabId) rememberConsultantTab(tabId);
    navigate('/consultant');
  }, [navigate]);

  return (
    <ConsultantProvider initialNav="students" preserveReturn onLeave={leave}>
      <ProfileShell onLeave={leave} dossier={dossier} />
    </ConsultantProvider>
  );
}
