import { useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { todayJalali } from '../../../calendar/lib/jalaliUtils';
import { setCalendarBase, calPathWeek } from '../../../calendar/lib/paths';
import { useConsultantStudents } from '../demo/hooks/useConsultantQueries';
import { ProfileHeader } from './components/ProfileHeader';
import { PROFILE } from './profileTheme';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { IdentityTab } from './tabs/IdentityTab';
import { InteractionsTab } from './tabs/InteractionsTab';

function resolveTab(pathname, userId) {
  const base = `/consultant/student/${userId}`;
  if (pathname.startsWith(`${base}/calendar`)) return 'calendar';
  if (pathname.startsWith(`${base}/analytics`)) return 'analytics';
  if (pathname.startsWith(`${base}/interactions`)) return 'interactions';
  if (pathname.startsWith(`${base}/identity`)) return 'identity';
  return 'calendar';
}

export default function StudentProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const numericId = Number(userId);
  const tab = resolveTab(location.pathname, userId);
  const [composeNonce, setComposeNonce] = useState(0);

  const { data: students = [] } = useConsultantStudents();
  const student = useMemo(
    () => students.find((s) => s.user_id === numericId),
    [students, numericId],
  );

  useLayoutEffect(() => {
    setCalendarBase(`/consultant/student/${userId}/calendar`);
    return () => setCalendarBase('/calendar');
  }, [userId]);

  // ورود مستقیم به ریشه پروفایل → تب تقویم (هسته عملیاتی)
  useLayoutEffect(() => {
    const base = `/consultant/student/${userId}`;
    if (location.pathname === base || location.pathname === `${base}/`) {
      const t = todayJalali();
      setCalendarBase(`${base}/calendar`);
      navigate(calPathWeek(t.jy, t.jm, t.jd), { replace: true });
    }
  }, [location.pathname, userId, navigate]);

  const goTab = (id) => {
    const base = `/consultant/student/${userId}`;
    if (id === 'calendar') {
      setCalendarBase(`${base}/calendar`);
      const t = todayJalali();
      navigate(calPathWeek(t.jy, t.jm, t.jd));
      return;
    }
    navigate(`${base}/${id}`);
  };

  const openMessageCompose = () => {
    goTab('interactions');
    setComposeNonce((n) => n + 1);
  };

  return (
    <div
      dir="rtl"
      className="h-dvh w-full overflow-hidden flex flex-col"
      style={{ fontFamily: PROFILE.font, background: PROFILE.pageBg }}
    >
      <ProfileHeader
        student={student}
        userId={userId}
        onBack={() => navigate('/consultant')}
        activeTab={tab}
        onTabChange={goTab}
        onMessage={openMessageCompose}
      />

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {tab === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CalendarTab userId={numericId} />
          </div>
        )}
        {tab === 'analytics' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <AnalyticsTab userId={numericId} />
          </div>
        )}
        {tab === 'interactions' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <InteractionsTab userId={numericId} composeNonce={composeNonce} />
          </div>
        )}
        {tab === 'identity' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <IdentityTab student={student} userId={numericId} />
          </div>
        )}
      </main>
    </div>
  );
}
