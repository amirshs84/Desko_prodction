import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { Card, EmptyState, PrimaryButton } from '../components/DemoUi';
import { useConsultantStudents } from '../hooks/useConsultantQueries';

function StudentsBody() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const filters = useMemo(() => {
    const f = {};
    if (search.trim()) f.search = search.trim();
    if (grade) f.grade = grade;
    return f;
  }, [search, grade]);

  const { data: students = [], isLoading, isError, error, refetch } = useConsultantStudents(filters);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">دانش‌آموزان</h2>
        <p className="text-sm text-gray-500 mt-1">فهرست مدرسه با گروه‌های شما؛ برای کار روی تقویم و پیشرفت باز کنید.</p>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجوی نام یا موبایل"
              className="w-full rounded-xl border border-gray-200 pr-10 pl-3 py-2.5 text-sm"
            />
          </div>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
          >
            <option value="">همه پایه‌ها</option>
            {['10', '11', '12'].map((g) => (
              <option key={g} value={g}>پایه {g}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {isLoading && <EmptyState message="در حال بارگذاری…" />}
        {isError && (
          <div className="p-6 text-center">
            <p className="text-sm text-red-500 mb-3">
              {error?.response?.data?.error?.message || 'خطا در دریافت فهرست'}
            </p>
            <PrimaryButton onClick={() => refetch()}>تلاش دوباره</PrimaryButton>
          </div>
        )}
        {!isLoading && !isError && students.length === 0 && (
          <EmptyState message="دانش‌آموزی پیدا نشد" />
        )}
        {!isLoading && !isError && students.length > 0 && (
          <div className="divide-y divide-gray-50">
            <div
              className="hidden md:grid gap-2 px-5 py-3 bg-gray-50 text-xs text-gray-400 font-medium"
              style={{ gridTemplateColumns: '1.4fr 0.7fr 1.2fr 1.4fr 100px' }}
            >
              <span>نام</span>
              <span>پایه</span>
              <span>کلاس‌ها</span>
              <span>گروه‌های من</span>
              <span />
            </div>
            {students.map((s) => (
              <div
                key={s.user_id}
                className="grid gap-2 px-5 py-4 items-center hover:bg-sky-50/40"
                style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}
              >
                <div className="min-w-0 md:contents">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.full_name || 'بدون نام'}
                    </p>
                    <p className="text-xs text-gray-500">{s.phone_number}</p>
                  </div>
                  <p className="hidden md:block text-sm text-gray-700">{s.grade || '—'}</p>
                  <p className="hidden md:block text-sm text-gray-600 truncate">
                    {(s.class_names || []).join('، ') || '—'}
                  </p>
                  <div className="hidden md:flex flex-wrap gap-1">
                    {(s.groups || []).length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      s.groups.map((g) => (
                        <span
                          key={g.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700"
                        >
                          {g.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <PrimaryButton
                  className="!py-1.5 !px-3 !text-xs whitespace-nowrap"
                  onClick={() => navigate(`/consultant/student/${s.user_id}`)}
                >
                  باز کردن
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function StudentsDesktop() {
  return (
    <DesktopPageShell title="دانش‌آموزان">
      <StudentsBody />
    </DesktopPageShell>
  );
}

export function StudentsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <StudentsBody />
    </MobilePageShell>
  );
}
