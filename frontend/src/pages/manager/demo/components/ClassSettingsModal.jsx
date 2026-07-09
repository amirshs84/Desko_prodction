import { useMemo, useState } from 'react';
import { X, Search, Pencil, UserPlus, Users } from 'lucide-react';
import { toPersianDigits, formatCount } from '../utils/classDataTransformers';

const GRADE_FILTER_OPTIONS = [
  { value: '', label: 'همه مقاطع' },
  { value: '7', label: 'هفتم' },
  { value: '8', label: 'هشتم' },
  { value: '9', label: 'نهم' },
  { value: '10', label: 'دهم' },
  { value: '11', label: 'یازدهم' },
  { value: '12', label: 'دوازدهم' },
  { value: 'graduate', label: 'فارغ‌التحصیل' },
];

export default function ClassSettingsModal({
  open,
  onClose,
  classes = [],
  loading = false,
  onEdit,
  onManageStudents,
}) {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (classes || []).filter((c) => {
      if (grade && c.grade !== grade) return false;
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q)
        || (c.code || '').toLowerCase().includes(q)
        || (c.grade_display || '').includes(q)
      );
    });
  }, [classes, search, grade]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl rounded-3xl p-6 shadow-xl max-h-[85vh] flex flex-col"
        style={{ background: '#fff' }}
      >
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">تنظیمات کلاس‌ها</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              ویرایش مشخصات یا مدیریت دانش‌آموزان هر کلاس
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-shrink-0">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <Search size={16} color="#9CA3AF" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی نام یا کد کلاس..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{ border: '1px solid #E5E7EB', background: '#fff' }}
          >
            {GRADE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-12">در حال بارگذاری...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">کلاسی یافت نشد</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#D1FAE5' }}
                  >
                    <Users size={18} color="#059669" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: c.is_active ? '#D1FAE5' : '#F3F4F6',
                          color: c.is_active ? '#059669' : '#6B7280',
                        }}
                      >
                        {c.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.code}
                      {c.grade_display ? ` · ${c.grade_display}` : ''}
                      {' · '}
                      {formatCount(c.student_count || 0)} دانش‌آموز
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit?.(c)}
                      className="p-2.5 rounded-xl hover:bg-white"
                      style={{ border: '1px solid #E5E7EB' }}
                      title="ویرایش کلاس"
                    >
                      <Pencil size={16} color="#374151" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onManageStudents?.(c)}
                      className="p-2.5 rounded-xl hover:bg-emerald-50"
                      style={{ border: '1px solid #A7F3D0', background: '#ECFDF5' }}
                      title="افزودن / حذف دانش‌آموز"
                    >
                      <UserPlus size={16} color="#059669" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 mt-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            {toPersianDigits(filtered.length)} از {formatCount(classes.length)} کلاس
          </p>
        </div>
      </div>
    </div>
  );
}
