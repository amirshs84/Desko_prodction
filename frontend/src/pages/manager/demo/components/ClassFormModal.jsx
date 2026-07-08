import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const GRADE_OPTIONS = [
  { value: '7', label: 'هفتم' },
  { value: '8', label: 'هشتم' },
  { value: '9', label: 'نهم' },
  { value: '10', label: 'دهم' },
  { value: '11', label: 'یازدهم' },
  { value: '12', label: 'دوازدهم' },
  { value: 'graduate', label: 'فارغ‌التحصیل' },
];

const EMPTY_FORM = { code: '', name: '', grade: '10', is_active: true };

export default function ClassFormModal({ open, onClose, onSubmit, initialData, loading, title }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        code: initialData.code || '',
        name: initialData.name || '',
        grade: initialData.grade || '10',
        is_active: initialData.is_active ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, initialData]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('کد و نام کلاس الزامی است');
      return;
    }
    const result = await onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
      grade: form.grade,
      is_active: form.is_active,
    });
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl p-6 shadow-xl"
        style={{ background: '#fff' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">کد کلاس</span>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="px-4 py-2.5 rounded-2xl text-sm outline-none"
              style={{ border: '1px solid #E5E7EB' }}
              placeholder="مثال: C-1101"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">نام کلاس</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2.5 rounded-2xl text-sm outline-none"
              style={{ border: '1px solid #E5E7EB' }}
              placeholder="مثال: ریاضی ۱۱/۱"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">مقطع</span>
            <select
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              className="px-4 py-2.5 rounded-2xl text-sm outline-none"
              style={{ border: '1px solid #E5E7EB' }}
            >
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-sm text-gray-700">کلاس فعال</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: '#10B981' }}
            >
              {loading ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
