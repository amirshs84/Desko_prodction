import { useState, useEffect, useMemo } from 'react';
import { X, Search, UserMinus, UserPlus } from 'lucide-react';
import {
  useClassStudentsQuery,
  useManagerStudentsQuery,
  useAddClassStudentsMutation,
  useRemoveClassStudentMutation,
  extractManagerClassError,
} from '../../../../hooks/useManagerQueries';
import { toPersianDigits } from '../utils/classDataTransformers';

const GRADE_FILTER_OPTIONS = [
  { value: '', label: 'همه پایه‌ها' },
  { value: '7', label: 'هفتم' },
  { value: '8', label: 'هشتم' },
  { value: '9', label: 'نهم' },
  { value: '10', label: 'دهم' },
  { value: '11', label: 'یازدهم' },
  { value: '12', label: 'دوازدهم' },
  { value: 'graduate', label: 'فارغ‌التحصیل' },
];

export default function ClassStudentsModal({ open, classItem, onClose }) {
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [debouncedAddSearch, setDebouncedAddSearch] = useState('');
  const [addGrade, setAddGrade] = useState('');
  const [error, setError] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAddSearch(addSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [addSearch]);

  useEffect(() => {
    if (!open || !classItem) return;
    setEnrolledSearch('');
    setAddSearch('');
    setDebouncedAddSearch('');
    setAddGrade(classItem.grade || '');
    setShowAddPanel(false);
    setSelectedIds([]);
    setError(null);
  }, [open, classItem]);

  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    error: enrolledError,
  } = useClassStudentsQuery(classItem?.id, { enabled: open && !!classItem });

  const enrolled = enrolledData?.students ?? [];

  const filteredEnrolled = useMemo(() => {
    const q = enrolledSearch.trim().toLowerCase();
    if (!q) return enrolled;
    return enrolled.filter((s) =>
      (s.full_name || '').toLowerCase().includes(q)
      || (s.phone_number || '').includes(q)
      || (s.grade_display || '').includes(q),
    );
  }, [enrolled, enrolledSearch]);

  const {
    data: availableData,
    isLoading: availableLoading,
  } = useManagerStudentsQuery(
    {
      search: debouncedAddSearch,
      ...(addGrade ? { grade: addGrade } : {}),
    },
    { enabled: open && !!classItem && showAddPanel },
  );

  const available = useMemo(() => {
    const enrolledIds = new Set(enrolled.map((s) => s.user_id));
    return (availableData?.students ?? []).filter((s) => !enrolledIds.has(s.user_id));
  }, [availableData, enrolled]);

  const addMutation = useAddClassStudentsMutation();
  const removeMutation = useRemoveClassStudentMutation();

  const actionLoading = addMutation.isPending || removeMutation.isPending;

  const queryError = enrolledError
    ? (enrolledError?.response?.data?.error || 'خطا در بارگذاری دانش‌آموزان')
    : null;

  if (!open || !classItem) return null;

  const handleRemove = async (userId) => {
    if (!window.confirm('این دانش‌آموز از کلاس حذف شود؟')) return;
    setError(null);
    try {
      await removeMutation.mutateAsync({ classId: classItem.id, userId });
    } catch (err) {
      setError(extractManagerClassError(err, 'خطا در حذف دانش‌آموز'));
    }
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    try {
      await addMutation.mutateAsync({ classId: classItem.id, studentIds: selectedIds });
      setSelectedIds([]);
      setShowAddPanel(false);
    } catch (err) {
      setError(extractManagerClassError(err, 'خطا در افزودن دانش‌آموزان'));
    }
  };

  const toggleSelect = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const displayError = error || queryError;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-3xl p-6 shadow-xl max-h-[90vh] flex flex-col"
        style={{ background: '#fff' }}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">دانش‌آموزان کلاس</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {classItem.name}
              {classItem.grade_display ? ` · ${classItem.grade_display}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAddPanel((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: showAddPanel ? '#059669' : '#10B981' }}
          >
            <UserPlus size={14} />
            {showAddPanel ? 'بستن افزودن' : 'افزودن دانش‌آموز'}
          </button>
          <span className="text-xs text-gray-500">
            {toPersianDigits(enrolled.length)} دانش‌آموز
          </span>
        </div>

        {displayError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3 flex-shrink-0">{displayError}</p>
        )}

        {showAddPanel && (
          <div className="mb-4 p-4 rounded-2xl flex-shrink-0" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-semibold text-gray-600 mb-3">انتخاب دانش‌آموز برای افزودن</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}
              >
                <Search size={14} color="#9CA3AF" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="جستجو بر اساس نام یا شماره..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              <select
                value={addGrade}
                onChange={(e) => setAddGrade(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E5E7EB', background: '#fff' }}
              >
                {GRADE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="max-h-44 overflow-y-auto flex flex-col gap-1 mb-3">
              {availableLoading ? (
                <p className="text-xs text-gray-400 text-center py-2">در حال جستجو...</p>
              ) : available.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">دانش‌آموزی یافت نشد</p>
              ) : (
                available.map((s) => (
                  <label key={s.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.user_id)}
                      onChange={() => toggleSelect(s.user_id)}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-800 block truncate">
                        {s.full_name || s.phone_number}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {s.phone_number}
                        {s.grade ? ` · پایه ${GRADE_FILTER_OPTIONS.find((g) => g.value === s.grade)?.label || s.grade}` : ''}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={actionLoading || selectedIds.length === 0}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#10B981' }}
            >
              افزودن {selectedIds.length > 0 ? `(${toPersianDigits(selectedIds.length)})` : ''}
            </button>
          </div>
        )}

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 flex-shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            value={enrolledSearch}
            onChange={(e) => setEnrolledSearch(e.target.value)}
            placeholder="فیلتر دانش‌آموزان کلاس..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {enrolledLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">در حال بارگذاری...</p>
          ) : filteredEnrolled.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {enrolled.length === 0 ? 'هنوز دانش‌آموزی ثبت‌نام نشده' : 'نتیجه‌ای یافت نشد'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredEnrolled.map((s) => (
                <div
                  key={s.user_id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: '#F9FAFB' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || '—'}</p>
                    <p className="text-xs text-gray-500">
                      {s.phone_number}
                      {s.grade_display ? ` · ${s.grade_display}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(s.user_id)}
                    disabled={actionLoading}
                    className="p-2 rounded-lg hover:bg-red-50 flex-shrink-0"
                    title="حذف از کلاس"
                  >
                    <UserMinus size={16} color="#EF4444" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
