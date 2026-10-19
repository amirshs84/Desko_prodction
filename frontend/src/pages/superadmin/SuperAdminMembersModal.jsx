import { useEffect, useMemo, useState } from 'react';
import { HiPencil, HiX } from 'react-icons/hi';
import { superadminAPI } from '../../api/client';

const ROLE_LABELS = {
  student: 'دانش‌آموز',
  manager: 'مدیر',
  consultant: 'مشاور',
};

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

const emptyForm = {
  phone_number: '',
  password: '',
  full_name: '',
  grade: '',
  olympiad_field: '',
  role: 'student',
};

export default function SuperAdminMembersModal({
  school,
  gradeOptions,
  olympiadOptions,
  onClose,
  onChanged,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await superadminAPI.getSchoolMembers(school.id);
      setMembers(res.data.members || []);
    } catch {
      setError('خطا در دریافت فهرست اعضا');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [school.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.phone_number || '').toLowerCase().includes(q) ||
        (ROLE_LABELS[m.role] || '').includes(q)
      );
    });
  }, [members, query, roleFilter]);

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      phone_number: member.phone_number || '',
      password: '',
      full_name: member.full_name || '',
      grade: member.grade || '',
      olympiad_field: member.olympiad_field || '',
      role: member.role || 'student',
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        phone_number: form.phone_number.trim(),
        full_name: form.full_name.trim(),
        grade: form.grade,
        olympiad_field: form.olympiad_field,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      await superadminAPI.updateSchoolMember(school.id, editing.id, payload);
      setEditing(null);
      setForm(emptyForm);
      await loadMembers();
      onChanged?.();
    } catch (err) {
      const d = err.response?.data;
      setError(
        (typeof d?.error === 'string' && d.error) ||
          d?.phone_number?.[0] ||
          d?.password?.[0] ||
          d?.role?.[0] ||
          'خطا در ذخیره تغییرات'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">اعضای مدرسه</h2>
            <p className="text-gray-600 text-sm mt-1">{school.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="بستن"
          >
            <HiX className="text-xl" />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام یا نام کاربری"
            className={inputClass}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`${inputClass} sm:max-w-[10rem]`}
          >
            <option value="all">همه نقش‌ها</option>
            <option value="manager">مدیر</option>
            <option value="consultant">مشاور</option>
            <option value="student">دانش‌آموز</option>
          </select>
        </div>

        {error && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">در حال بارگذاری…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">عضوی یافت نشد</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {m.full_name || 'بدون نام'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate" dir="ltr">
                      {m.phone_number}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {m.role_display || ROLE_LABELS[m.role]}
                      {m.grade_display ? ` · ${m.grade_display}` : ''}
                      {m.is_password_set ? ' · رمز تنظیم شده' : ' · بدون رمز'}
                      {m.is_demo ? ' · دمو' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="shrink-0 px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 flex items-center gap-1"
                  >
                    <HiPencil />
                    ویرایش
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[92vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-1">ویرایش حساب</h3>
            <p className="text-sm text-gray-500 mb-5">{editing.full_name || editing.phone_number}</p>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام کاربری</label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className={`${inputClass} font-mono`}
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رمز عبور جدید
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                  autoComplete="new-password"
                  placeholder="خالی بگذارید اگر تغییری نمی‌خواهید"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نقش</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputClass}
                >
                  <option value="student">دانش‌آموز</option>
                  <option value="manager">مدیر</option>
                  <option value="consultant">مشاور</option>
                </select>
              </div>
              {form.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">پایه</label>
                    <select
                      value={form.grade}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      className={inputClass}
                    >
                      {gradeOptions.map((o) => (
                        <option key={o.value || 'empty-grade'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المپیاد</label>
                    <select
                      value={form.olympiad_field}
                      onChange={(e) => setForm({ ...form, olympiad_field: e.target.value })}
                      className={inputClass}
                    >
                      {olympiadOptions.map((o) => (
                        <option key={o.value || 'empty-olympiad'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50"
                >
                  {saving ? 'در حال ذخیره…' : 'ذخیره'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
