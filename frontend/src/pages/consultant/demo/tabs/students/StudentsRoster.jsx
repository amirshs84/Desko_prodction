import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, X } from 'lucide-react';
import { Card, EmptyState, PrimaryButton } from '../../components/DemoUi';
import { useConsultant } from '../../context/ConsultantContext';
import {
  useConsultantPreferences,
  useConsultantRoster,
  useGroupMutations,
} from '../../hooks/useConsultantQueries';
import { openStudentProfile } from '../../lib/navigation';
import {
  FALLBACK_COLUMNS,
  GRADE_OPTIONS,
  PERIODS,
  ROSTER,
  cellValue,
  formatDuration,
  performanceColor,
  performanceLabel,
} from './rosterUtils';

export function StudentsRoster() {
  const navigate = useNavigate();
  const { activeNav } = useConsultant();
  const goStudent = (userId) =>
    openStudentProfile(navigate, userId, { fromTab: activeNav || 'students' });
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [tag, setTag] = useState('');
  const [minHours, setMinHours] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const filters = useMemo(() => {
    const f = { period };
    if (search.trim()) f.search = search.trim();
    if (grade) f.grade = grade;
    if (tag.trim()) f.tag = tag.trim();
    if (minHours !== '' && !Number.isNaN(Number(minHours))) {
      f.min_study_hours = Number(minHours);
    }
    return f;
  }, [search, grade, period, tag, minHours]);

  const { data, isLoading, isError, error, refetch } = useConsultantRoster(filters);
  const { data: prefs } = useConsultantPreferences();
  const students = data?.students || [];
  const visibleKeys = prefs?.visible_roster_columns;
  const columns = (data?.columns?.length ? data.columns : FALLBACK_COLUMNS)
    .filter((c) => c.key !== 'full_name')
    .filter((c) => !visibleKeys?.length || visibleKeys.includes(c.key));

  useEffect(() => {
    setSelected(new Set());
  }, [period, grade, tag, minHours, search]);

  const allSelected = students.length > 0 && selected.size === students.length;
  const showHeat = period === 'weekly' || period === 'monthly';

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.user_id)));
  };

  return (
    <div
      className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto flex flex-col gap-5"
      style={{ minHeight: '100%' }}
    >
      <div>
        <h2 className="text-2xl font-bold" style={{ color: ROSTER.ink }}>دانش‌آموزان</h2>
        <p className="text-sm mt-1" style={{ color: ROSTER.muted }}>
          پایش تجمعی، فیلتر ترکیبی و ایجاد گروه از روی فهرست
        </p>
      </div>

      {/* فیلترها + نمای زمانی */}
      <Card className="!p-4" style={{ border: `1px solid ${ROSTER.border}` }}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 p-1 rounded-xl bg-gray-50 w-full sm:w-auto self-start">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: period === p.id ? ROSTER.brand : 'transparent',
                  color: period === p.id ? '#fff' : ROSTER.muted,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
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
              {GRADE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="برچسب (مثل #کنکوری)"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              placeholder="حداقل ساعت مطالعه"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>
          <p className="text-[11px]" style={{ color: ROSTER.muted }}>
            مثال فیلتر ترکیبی: برچسب <span className="font-semibold">#کنکوری</span>
            {' '}و حداقل ساعت مطالعه <span className="font-semibold">۲۰</span> در نمای هفتگی
          </p>
        </div>
      </Card>

      {isLoading && <EmptyState message="در حال بارگذاری فهرست…" />}
      {isError && (
        <div className="p-6 text-center">
          <p className="text-sm text-red-500 mb-3">
            {error?.response?.data?.error?.message || 'خطا در دریافت فهرست'}
          </p>
          <PrimaryButton onClick={() => refetch()} style={{ background: ROSTER.brand }}>
            تلاش دوباره
          </PrimaryButton>
        </div>
      )}
      {!isLoading && !isError && students.length === 0 && (
        <EmptyState message="دانش‌آموزی با این فیلتر پیدا نشد" />
      )}

      {!isLoading && !isError && students.length > 0 && (
        <>
          {/* دسکتاپ: Data Grid */}
          <Card className="!p-0 overflow-hidden hidden md:block" style={{ border: `1px solid ${ROSTER.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] text-gray-400 font-semibold">
                    <th className="sticky right-0 bg-gray-50 z-10 px-3 py-3 w-10 text-right">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="انتخاب همه"
                        className="rounded border-gray-300 accent-emerald-600"
                      />
                    </th>
                    <th className="sticky right-10 bg-gray-50 z-10 px-3 py-3 text-right min-w-[180px]">
                      نام
                    </th>
                    {columns.map((col) => (
                      <th key={col.key} className="px-3 py-3 text-right whitespace-nowrap font-semibold">
                        {col.label}
                        {col.placeholder && (
                          <span className="mr-1 text-[10px] font-normal text-gray-300">· به‌زودی</span>
                        )}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s) => (
                    <tr
                      key={s.user_id}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="sticky right-0 bg-white px-3 py-3 z-[1]">
                        <input
                          type="checkbox"
                          checked={selected.has(s.user_id)}
                          onChange={() => toggleOne(s.user_id)}
                          aria-label={`انتخاب ${s.full_name}`}
                          className="rounded border-gray-300 accent-emerald-600"
                        />
                      </td>
                      <td className="sticky right-10 bg-white px-3 py-3 z-[1]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {showHeat && (
                            <span
                              title={performanceLabel(s.performance)}
                              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                              style={{ background: performanceColor(s.performance) }}
                            />
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => goStudent(s.user_id)}
                              className="font-semibold truncate max-w-[200px] block text-right hover:underline"
                              style={{ color: ROSTER.brandStrong }}
                            >
                              {s.full_name || 'بدون نام'}
                            </button>
                            <p className="text-[11px] text-gray-400 mt-0.5" dir="ltr">
                              {s.phone_number || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-3 whitespace-nowrap align-middle">
                          <DynamicCell student={s} column={col} showHeat={showHeat} />
                        </td>
                      ))}
                      <td className="px-3 py-3 text-left">
                        <button
                          type="button"
                          onClick={() => goStudent(s.user_id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: ROSTER.brand }}
                        >
                          پروفایل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t text-[11px] text-gray-400 flex justify-between" style={{ borderColor: ROSTER.border }}>
              <span>{students.length} دانش‌آموز</span>
              <span>بازه: {PERIODS.find((p) => p.id === period)?.label}</span>
            </div>
          </Card>

          {/* موبایل: کارت‌ها */}
          <div className="md:hidden flex flex-col gap-3 pb-24">
            {students.map((s) => (
              <MobileStudentCard
                key={s.user_id}
                student={s}
                selected={selected.has(s.user_id)}
                onToggle={() => toggleOne(s.user_id)}
                onOpen={() => goStudent(s.user_id)}
                showHeat={showHeat}
                periodLabel={PERIODS.find((p) => p.id === period)?.label}
              />
            ))}
          </div>
        </>
      )}

      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          memberIds={[...selected]}
          students={students}
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => {
            setShowCreateGroup(false);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}

function DynamicCell({ student, column, showHeat }) {
  const value = cellValue(student, column);

  if (column.type === 'heatmap') {
    if (!showHeat) {
      return <span className="text-xs text-gray-300">—</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ background: performanceColor(value) }}
        />
        <span className="text-xs text-gray-600">{performanceLabel(value)}</span>
      </div>
    );
  }

  if (column.type === 'duration') {
    return (
      <span className="font-semibold tabular-nums" style={{ color: ROSTER.ink }}>
        {formatDuration(value)}
      </span>
    );
  }

  if (column.type === 'number') {
    if (value == null && column.placeholder) {
      return <span className="text-xs text-gray-300">—</span>;
    }
    return <span className="tabular-nums text-gray-700">{value ?? 0}</span>;
  }

  if (column.type === 'tags') {
    const tags = value || [];
    if (!tags.length) return <span className="text-xs text-gray-300">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: ROSTER.brandSoft, color: ROSTER.brandStrong }}
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (column.type === 'groups') {
    const groups = value || [];
    if (!groups.length) return <span className="text-xs text-gray-300">—</span>;
    return (
      <div className="flex flex-wrap gap-1 max-w-[160px]">
        {groups.map((g) => (
          <span
            key={g.id}
            className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600"
          >
            {g.name}
          </span>
        ))}
      </div>
    );
  }

  if (value == null || value === '') {
    return <span className="text-xs text-gray-300">—</span>;
  }
  return <span className="text-gray-700">{value}</span>;
}

function MobileStudentCard({ student, selected, onToggle, onOpen, showHeat, periodLabel }) {
  return (
    <div
      className="rounded-2xl p-4 border bg-white shadow-sm"
      style={{ borderColor: selected ? ROSTER.brand : ROSTER.border }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 rounded accent-emerald-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showHeat && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: performanceColor(student.performance) }}
                title={performanceLabel(student.performance)}
              />
            )}
            <button
              type="button"
              onClick={onOpen}
              className="font-bold text-sm truncate hover:underline"
              style={{ color: ROSTER.brandStrong }}
            >
              {student.full_name || 'بدون نام'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            پایه {student.grade || '—'}
            {(student.class_names || []).length
              ? ` · ${student.class_names.join('، ')}`
              : ''}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <MetricChip
              label={`مطالعه ${periodLabel || ''}`}
              value={formatDuration(student.study_seconds)}
            />
            <MetricChip
              label="تعداد تست"
              value={student.test_count == null ? '—' : String(student.test_count)}
            />
            <MetricChip label="جلسات" value={String(student.session_count ?? 0)} />
            <MetricChip
              label="آخرین آزمون"
              value={student.last_exam_status || '—'}
            />
          </div>

          {(student.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {student.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: ROSTER.brandSoft, color: ROSTER.brandStrong }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricChip({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-2.5 py-2">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-800 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function BulkActionBar({ count, onClear, onCreateGroup }) {
  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40
                 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border"
      style={{
        background: '#fff',
        borderColor: ROSTER.border,
        boxShadow: '0 12px 40px rgba(5,150,105,0.18)',
      }}
    >
      <button
        type="button"
        onClick={onClear}
        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
        aria-label="لغو انتخاب"
      >
        <X size={16} />
      </button>
      <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
        {count} نفر انتخاب شده
      </span>
      <button
        type="button"
        onClick={onCreateGroup}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: ROSTER.brand }}
      >
        <Users size={16} />
        ایجاد گروه جدید
      </button>
    </div>
  );
}

function CreateGroupModal({ memberIds, students, onClose, onCreated }) {
  const { createGroup } = useGroupMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const names = students
    .filter((s) => memberIds.includes(s.user_id))
    .map((s) => s.full_name || s.phone_number)
    .slice(0, 6);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        member_ids: memberIds,
      });
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ایجاد گروه');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.45)' }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-3"
      >
        <h3 className="text-lg font-bold text-gray-900">ایجاد گروه جدید</h3>
        <p className="text-xs text-gray-500">
          {memberIds.length} عضو:
          {' '}
          {names.join('، ')}
          {memberIds.length > names.length ? ' و …' : ''}
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام گروه"
          required
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیحات (اختیاری)"
          rows={2}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={createGroup.isPending || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: ROSTER.brand }}
          >
            {createGroup.isPending ? '…' : 'ذخیره تغییرات'}
          </button>
        </div>
      </form>
    </div>
  );
}
