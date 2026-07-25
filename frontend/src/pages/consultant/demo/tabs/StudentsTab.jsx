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
            {[
              ['7', 'هفتم'], ['8', 'هشتم'], ['9', 'نهم'],
              ['10', 'دهم'], ['11', 'یازدهم'], ['12', 'دوازدهم'],
            ].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
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
            <div className="hidden md:grid md:grid-cols-[minmax(0,1.6fr)_4.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)_6.5rem] gap-3 px-5 py-3 bg-gray-50 text-xs text-gray-400 font-medium">
              <span>نام</span>
              <span>پایه</span>
              <span>کلاس‌ها</span>
              <span>گروه‌های من</span>
              <span className="text-left">اقدام</span>
            </div>
            {students.map((s) => (
              <div
                key={s.user_id}
                className="flex flex-col gap-3 px-5 py-4 hover:bg-sky-50/40 md:grid md:grid-cols-[minmax(0,1.6fr)_4.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)_6.5rem] md:gap-3 md:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {s.full_name || 'بدون نام'}
                  </p>
                  <p className="text-xs text-gray-500" dir="ltr">
                    {s.phone_number}
                  </p>
                  <div className="md:hidden mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>پایه {s.grade || '—'}</span>
                    <span>·</span>
                    <span>{(s.class_names || []).join('، ') || 'بدون کلاس'}</span>
                  </div>
                  <div className="md:hidden mt-2 flex flex-wrap gap-1">
                    {(s.groups || []).map((g) => (
                      <span
                        key={g.id}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="hidden md:block text-sm text-gray-700 tabular-nums">
                  {s.grade || '—'}
                </p>
                <p className="hidden md:block text-sm text-gray-600 truncate">
                  {(s.class_names || []).join('، ') || '—'}
                </p>
                <div className="hidden md:flex flex-wrap gap-1 min-w-0">
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

                <div className="md:justify-self-end">
                  <PrimaryButton
                    className="!w-auto !py-1.5 !px-3 !text-xs whitespace-nowrap"
                    onClick={() => navigate(`/consultant/student/${s.user_id}`)}
                  >
                    باز کردن
                  </PrimaryButton>
                </div>
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
