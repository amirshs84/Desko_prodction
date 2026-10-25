import { useNavigate } from 'react-router-dom';
import { useConsultantStudents } from '../../hooks/useConsultantQueries';
import { openStudentProfile } from '../../lib/navigation';
import { DESKTOP_STUDENTS, MOBILE_STUDENTS } from '../students/catalog';
import { useReports } from './reportsModel';
import { AnalysisRow, MovementCards, ParentReports, ReportsNotice, ReportsSpotlight } from './reportsPieces';

function useOpenStudent() {
  const navigate = useNavigate();
  const { data: liveStudents } = useConsultantStudents();
  return (name) => {
    const live = (liveStudents || []).find((item) => (item.full_name || '').trim() === name);
    const catalog = [...DESKTOP_STUDENTS, ...MOBILE_STUDENTS].find((item) => item.name === name);
    openStudentProfile(navigate, live?.user_id || catalog?.id || name, { fromTab: 'analytics' });
  };
}

export function ReportsBody() {
  const reports = useReports();
  const openStudent = useOpenStudent();
  return (
    <div className="px-4 xl:px-6 pb-8 flex flex-col gap-3 min-w-0">
      <ReportsNotice notice={reports.notice} />
      <ReportsSpotlight reports={reports} />
      <MovementCards reports={reports} onOpen={openStudent} />
      <AnalysisRow />
      <ParentReports reports={reports} onOpen={openStudent} />
    </div>
  );
}
