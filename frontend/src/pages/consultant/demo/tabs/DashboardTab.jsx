import { useNavigate } from 'react-router-dom';
import { Users, UsersRound, History, AlertTriangle, ClipboardList } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { Card, PrimaryButton, SecondaryButton } from '../components/DemoUi';
import { useConsultant } from '../context/ConsultantContext';
import { useConsultantStudents, useConsultantGroups, usePlanRuns } from '../hooks/useConsultantQueries';

function DashboardBody() {
  const navigate = useNavigate();
  const { navigateToTab } = useConsultant();
  const { data: students = [], isLoading: loadingStudents } = useConsultantStudents();
  const { data: groups = [], isLoading: loadingGroups } = useConsultantGroups();
  const { data: runs = [], isLoading: loadingRuns } = usePlanRuns();

  const pending = runs.reduce((sum, run) => sum + (run.pending_count || 0), 0);
  const recentRuns = runs.slice(0, 5);
  const recentGroups = groups.slice(0, 5);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد مشاور</h2>
        <p className="text-sm text-gray-500 mt-1">خلاصه وضعیت دانش‌آموزان و برنامه‌های گروهی</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="دانش‌آموزان" value={loadingStudents ? '…' : students.length} icon={Users} />
        <Kpi title="گروه‌های من" value={loadingGroups ? '…' : groups.length} icon={UsersRound} />
        <Kpi title="اجراهای اخیر" value={loadingRuns ? '…' : runs.length} icon={History} />
        <Kpi title="پیشنهاد در انتظار" value={loadingRuns ? '…' : pending} icon={AlertTriangle} danger={pending > 0} />
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => navigateToTab('planning')}>
          <span className="inline-flex items-center gap-2">
            <ClipboardList size={16} /> برنامه‌ریزی گروهی جدید
          </span>
        </PrimaryButton>
        <SecondaryButton onClick={() => navigateToTab('students')}>فهرست دانش‌آموزان</SecondaryButton>
        <SecondaryButton onClick={() => navigateToTab('groups')}>مدیریت گروه‌ها</SecondaryButton>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-gray-900 text-sm mb-4">گروه‌های اخیر</h3>
          {recentGroups.length === 0 ? (
            <p className="text-sm text-gray-400">هنوز گروهی نساخته‌اید.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentGroups.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                    <p className="text-xs text-gray-500">{g.member_count} عضو</p>
                  </div>
                  <SecondaryButton
                    className="!py-1.5 !px-3 !text-xs"
                    onClick={() => navigateToTab('planning', { groupId: g.id })}
                  >
                    برنامه‌ریزی
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 text-sm mb-4">اجراهای اخیر</h3>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-400">هنوز برنامه‌ای منتشر نشده است.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentRuns.map((run) => (
                <li key={run.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {run.mode === 'forced' ? 'قطعی' : 'پیشنهادی'} · {run.intensity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {run.student_count} دانش‌آموز
                      {run.pending_count ? ` · ${run.pending_count} در انتظار` : ''}
                    </p>
                  </div>
                  <SecondaryButton
                    className="!py-1.5 !px-3 !text-xs"
                    onClick={() => navigateToTab('history')}
                  >
                    جزئیات
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-gray-900 text-sm mb-3">میانبر ورک‌اسپیس</h3>
        <p className="text-sm text-gray-500 mb-4">
          برای دیدن پیشرفت، تقویم و نسخه‌ها، یک دانش‌آموز را از فهرست باز کنید.
        </p>
        <div className="flex flex-wrap gap-2">
          {students.slice(0, 6).map((s) => (
            <button
              key={s.user_id}
              onClick={() => navigate(`/consultant/student/${s.user_id}`)}
              className="px-3 py-2 rounded-xl text-sm bg-sky-50 text-sky-700 hover:bg-sky-100"
            >
              {s.full_name || s.phone_number}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ title, value, icon: Icon, danger }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium">{title}</span>
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: danger ? '#FEE2E2' : '#E0F2FE' }}
        >
          <Icon size={16} color={danger ? '#EF4444' : '#0284C7'} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: danger ? '#EF4444' : '#111827' }}>
        {value}
      </p>
    </Card>
  );
}

export function DashboardDesktop() {
  return (
    <DesktopPageShell title="داشبورد">
      <DashboardBody />
    </DesktopPageShell>
  );
}

export function DashboardMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <DashboardBody />
    </MobilePageShell>
  );
}
