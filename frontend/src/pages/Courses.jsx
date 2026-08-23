import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ClipboardList,
  LogOut,
  Medal,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import ConsultantFAB from '../components/ConsultantFAB';
import { authAPI, dataAPI } from '../api/client';
import { performLogout } from '../utils/auth';
import { useSubjects, useInvalidateSubjects } from '../hooks/useDataQueries';

function MenuIcon({ icon: Icon, className }) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
    </span>
  );
}

const PREDEFINED_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981',
  '#f59e0b', '#ef4444', '#06b6d4', '#6366f1',
];

const Courses = () => {
  const navigate = useNavigate();
  const { data: courses = [] } = useSubjects();
  const invalidateSubjects = useInvalidateSubjects();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCoursesManager, setShowCoursesManager] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#3b82f6');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [personalizationNotifications, setPersonalizationNotifications] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editOlympiad, setEditOlympiad] = useState('');
  const [editStudyField, setEditStudyField] = useState('');
  const [loading, setLoading] = useState(false);

  const gradeOptions = [
    { value: '7',        label: 'هفتم' },
    { value: '8',        label: 'هشتم' },
    { value: '9',        label: 'نهم' },
    { value: '10',       label: 'دهم' },
    { value: '11',       label: 'یازدهم' },
    { value: '12',       label: 'دوازدهم' },
    { value: 'graduate', label: 'فارغ‌التحصیل' },
  ];

  const studyFieldOptions = [
    { value: 'math_physics', label: 'ریاضی فیزیک' },
    { value: 'experimental', label: 'علوم تجربی' },
    { value: 'humanities',   label: 'علوم انسانی' },
  ];

  const extracurricularOptions = [
    { value: 'programming', label: 'برنامه نویسی' },
    { value: 'ai',          label: 'هوش مصنوعی' },
    { value: 'konkur',      label: 'کنکور' },
    { value: 'math',        label: 'المپیاد ریاضی' },
    { value: 'physics',     label: 'المپیاد فیزیک' },
    { value: 'chemistry',   label: 'المپیاد شیمی' },
    { value: 'biology',     label: 'المپیاد زیست‌شناسی' },
    { value: 'computer',    label: 'المپیاد کامپیوتر' },
    { value: 'astronomy',   label: 'المپیاد نجوم' },
  ];

  const showStudyField = ['10', '11', '12'].includes(editGrade);

  useEffect(() => {
    const initData = async () => {
      if (!localStorage.getItem('isLoggedIn')) { navigate('/login'); return; }
      try {
        setLoading(true);
        const profileRes = await authAPI.getProfile();
        setEditFullName(profileRes.data.full_name || '');
        setEditGrade(profileRes.data.grade || '');
        setEditOlympiad(profileRes.data.olympiad_field || '');
      } catch (error) {
        console.error('Error loading data:', error);
        if (error.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [navigate]);

  /* ── عملیات ── */
  const handleLogout = async () => {
    if (!confirm('آیا از خروج از حساب کاربری مطمئن هستید؟')) return;
    await performLogout();
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) { alert('لطفاً نام و نام خانوادگی را وارد کنید'); return; }
    if (!editGrade)           { alert('لطفاً پایه تحصیلی را انتخاب کنید'); return; }
    if (!editOlympiad)        { alert('لطفاً فوق برنامه را انتخاب کنید'); return; }
    try {
      await authAPI.updateProfile({
        full_name: editFullName, grade: editGrade, olympiad_field: editOlympiad,
      });
      localStorage.setItem('userName', editFullName);
      localStorage.setItem('userGrade', editGrade);
      localStorage.setItem('userOlympiad', editOlympiad);
      setShowEditProfile(false);
      alert('اطلاعات پروفایل با موفقیت به‌روز شد! ✅');
    } catch (error) {
      console.error(error);
      alert('خطا در ذخیره پروفایل.');
    }
  };

  const resetCourseModal = () => {
    setShowAddModal(false);
    setEditingCourse(null);
    setNewCourseName('');
    setNewCourseColor('#3b82f6');
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) { alert('لطفا نام درس را وارد کنید!'); return; }
    const isDuplicate = courses.some(
      (c) => c.name.trim().toLowerCase() === newCourseName.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert(`درس "${newCourseName.trim()}" قبلاً ثبت شده است!`);
      return;
    }
    try {
      await dataAPI.createSubject({ name: newCourseName.trim(), color_code: newCourseColor });
      invalidateSubjects();
      resetCourseModal();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.name || error.response?.data?.detail;
      alert(msg || 'خطا در ایجاد درس.');
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!confirm(`آیا از حذف درس "${course.name}" مطمئن هستید؟\nتمام جلسات مطالعه مرتبط نیز حذف خواهند شد.`)) return;
    try {
      await dataAPI.deleteSubject(course.id);
      invalidateSubjects();
      resetCourseModal();
    } catch (error) {
      console.error(error);
      alert('خطا در حذف درس.');
    }
  };

  const handleEditCourse = async () => {
    if (!newCourseName.trim()) { alert('لطفا نام درس را وارد کنید!'); return; }
    try {
      await dataAPI.updateSubject(editingCourse.id, {
        name: newCourseName.trim(), color_code: newCourseColor,
      });
      invalidateSubjects();
      resetCourseModal();
    } catch (error) {
      console.error(error);
      alert('خطا در ویرایش درس.');
    }
  };

  /* ── کلاس‌های مشترک ── */
  const inputClass =
    'w-full px-4 py-3 bg-card-deep/50 text-ink rounded-xl border border-edge ' +
    'focus:outline-none focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 transition-all';

  const overlayClass =
    'fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 px-4';

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <div className="h-full flex flex-col bg-bg text-ink">
      <div className="flex-1 overflow-y-auto overscroll-none p-4 md:p-8 pb-nav-safe">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400
                         to-teal-500 bg-clip-text text-transparent pb-2">
            تنظیمات
          </h1>
          <p className="text-ink-3 text-sm mt-2">مدیریت درس‌ها و تنظیمات</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-edge mb-6">
          <h2 className="text-xl font-bold mb-4 text-brand">مدیریت</h2>
          <div className="space-y-3">
            <button onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={User} className="bg-violet-500/12 text-violet-400" />
                <div className="text-right">
                  <div className="font-semibold">پروفایل</div>
                  <div className="text-sm text-ink-3">{editFullName}</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>

            <button onClick={() => setShowCoursesManager(true)}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={BookOpen} className="bg-emerald-500/12 text-emerald-400" />
                <div className="text-right">
                  <div className="font-semibold">درس‌های من</div>
                  <div className="text-sm text-ink-3">{courses.length} درس ثبت شده</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => navigate('/exams')}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={ClipboardList} className="bg-sky-500/12 text-sky-400" />
                <div className="text-right">
                  <div className="font-semibold">آزمون‌ها</div>
                  <div className="text-sm text-ink-3">نتایج و تحلیل آزمون‌های جامع</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => navigate('/achievements')}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={Medal} className="bg-yellow-500/12 text-yellow-400" />
                <div className="text-right">
                  <div className="font-semibold">مدال‌ها و نشان‌ها</div>
                  <div className="text-sm text-ink-3">دستاوردها و افتخارات تحصیلی</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => setShowPersonalization(true)}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={Sparkles} className="bg-amber-500/12 text-amber-400" />
                <div className="text-right">
                  <div className="font-semibold">شخصی‌سازی</div>
                  <div className="text-sm text-ink-3">ظاهر و ترجیحات ساده اپ</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>

            <button onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-between p-4 bg-panel
                         hover:bg-panel-hover rounded-lg transition">
              <div className="flex items-center gap-3">
                <MenuIcon icon={RefreshCw} className="bg-teal-500/12 text-teal-400" />
                <div className="text-right">
                  <div className="font-semibold">به‌روزرسانی اپلیکیشن</div>
                  <div className="text-sm text-ink-3">بررسی و نصب آپدیت</div>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* ── شخصی‌سازی (صفحه تمام‌قد) ── */}
      {showPersonalization && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-bg animate-fadeIn">
          <div
            className="flex shrink-0 items-center justify-between border-b border-edge bg-card px-4 pb-4"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
            <button
              type="button"
              onClick={() => setShowPersonalization(false)}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-brand hover:bg-panel">
              بازگشت
            </button>
            <h2 className="text-lg font-bold text-ink">شخصی‌سازی</h2>
            <div className="w-14 shrink-0" aria-hidden />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-28">
            <p className="mb-8 text-center text-sm leading-relaxed text-ink-3">
              با گسترش نسخه‌های بعد، گزینه‌های بیشتری به این بخش اضافه می‌شود؛ فعلاً می‌توانی ترجیح
              ساده‌ای مثل نوتیفیکیشن را فعال یا غیرفعال کنی (نمایشی).
            </p>

            <div className="mx-auto max-w-lg space-y-3">
              <div
                role="presentation"
                className="flex min-h-[56px] items-center justify-between gap-4 rounded-2xl border border-edge bg-panel px-5 py-4">
                <div className="min-w-0 text-right">
                  <div className="font-semibold text-ink-2">اعلان‌های برنامه</div>
                  <div className="mt-1 text-xs text-ink-4">
                    به‌محض آماده‌شدن سرویس اعلان واقعی از همین کلید استفاده می‌شود.
                  </div>
                </div>
                <label className="relative inline-flex h-9 w-[52px] shrink-0 cursor-pointer items-center" dir="ltr">
                  <input
                    type="checkbox"
                    checked={personalizationNotifications}
                    onChange={(e) => setPersonalizationNotifications(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="block h-full w-full rounded-full bg-panel-hover transition-colors peer-checked:bg-[var(--t-brand-2)]" />
                  <span className="pointer-events-none absolute top-1 start-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 will-change-transform peer-checked:translate-x-[22px]" />
                </label>
              </div>

              <p className="text-center text-xs text-ink-4 pt-4">
                وضعیت فعلی: {personalizationNotifications ? 'فعال (نمایشی)' : 'خاموش'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── مدیر درس‌ها (Full-screen) ── */}
      {showCoursesManager && (
        <div className="fixed inset-0 bg-bg backdrop-blur-sm flex flex-col z-50 animate-fadeIn">
          <div className="flex items-center justify-between px-4 pb-4 border-b border-edge bg-card"
               style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
            <h2 className="text-xl font-bold text-brand">مدیریت درس‌ها</h2>
            <button onClick={() => setShowCoursesManager(false)}
              className="text-ink-3 hover:text-ink text-3xl px-2">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {courses.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-xl font-semibold mb-2 text-ink-2">هنوز درسی اضافه نشده است</h2>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {courses.map((course) => (
                  <div key={course.id}
                    className="bg-panel rounded-xl p-4 border border-edge-2 flex items-center
                               justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: course.color_code || course.color }} />
                      <h3 className="font-semibold text-ink-2">{course.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCourse(course);
                          setNewCourseName(course.name);
                          setNewCourseColor(course.color_code || course.color || '#3b82f6');
                          setShowAddModal(true);
                        }}
                        className="p-2 text-ink-3 hover:text-blue-400 transition bg-card rounded-lg"
                        title="ویرایش">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 text-ink-3 hover:text-red-400 transition bg-card rounded-lg"
                        title="حذف">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { setEditingCourse(null); setNewCourseName(''); setNewCourseColor('#3b82f6'); setShowAddModal(true); }}
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl
                         hover:from-blue-700 hover:to-purple-700 transition-all duration-300
                         shadow-lg font-semibold text-lg flex items-center justify-center gap-2">
              <span className="text-2xl">+</span> افزودن درس جدید
            </button>
          </div>
        </div>
      )}

      {/* ── مدال افزودن/ویرایش درس ── */}
      {showAddModal && (
        <div className={overlayClass} style={{ background: 'var(--t-overlay-md)' }}>
          <div className="bg-card rounded-2xl p-8 max-w-md w-full border border-edge shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink-2">
                {editingCourse ? 'ویرایش درس' : 'افزودن درس'}
              </h2>
              <button onClick={resetCourseModal} className="text-ink-3 hover:text-ink text-2xl">×</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-ink-3 mb-2 text-sm">نام درس</label>
                <input type="text" value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="مثلا: ریاضی"
                  className="w-full px-4 py-3 bg-panel text-ink rounded-lg border border-edge-2
                             focus:outline-none focus:border-blue-500"
                  autoFocus />
              </div>

              <div>
                <label className="block text-ink-3 mb-3 text-sm">رنگ</label>
                <div className="flex gap-3 flex-wrap">
                  {PREDEFINED_COLORS.map((color) => (
                    <button key={color} onClick={() => setNewCourseColor(color)}
                      className={`w-12 h-12 rounded-lg transition-all ${
                        newCourseColor === color
                          ? 'ring-4 ring-white ring-offset-2 ring-offset-card scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              {editingCourse ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(editingCourse)}
                  className="w-full px-6 py-3 rounded-lg border border-red-800/50 bg-red-900/20
                             text-red-400 hover:bg-red-900/30 transition font-semibold">
                  حذف درس
                </button>
              ) : null}

              <div className="flex gap-3 mt-3">
                <button onClick={resetCourseModal}
                  className="flex-1 px-6 py-3 bg-panel rounded-lg hover:bg-panel-hover
                             transition font-semibold text-ink">
                  انصراف
                </button>
                <button
                  onClick={editingCourse ? handleEditCourse : handleAddCourse}
                  disabled={!newCourseName.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600
                             rounded-lg hover:from-blue-600 hover:to-purple-700 transition
                             font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                  {editingCourse ? 'ذخیره تغییرات' : 'افزودن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── مدال ویرایش پروفایل ── */}
      {showEditProfile && (
        <div className={overlayClass} style={{ background: 'var(--t-overlay)' }}>
          <div className="bg-card rounded-2xl p-6 md:p-8 max-w-lg w-full border border-brand-2/30
                          shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-brand">ویرایش پروفایل</h2>
                <p className="text-sm text-ink-3 mt-1">اطلاعات خود را به‌روزرسانی کنید</p>
              </div>
              <button onClick={() => setShowEditProfile(false)}
                className="text-ink-3 hover:text-ink text-2xl">×</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-ink-3 mb-2 text-sm font-medium">نام و نام خانوادگی</label>
                <input type="text" value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-ink-3 mb-2 text-sm font-medium">پایه تحصیلی</label>
                <select value={editGrade} onChange={(e) => {
                  const grade = e.target.value;
                  setEditGrade(grade);
                  if (!['10', '11', '12'].includes(grade)) setEditStudyField('');
                }}
                  className={`${inputClass} cursor-pointer`}>
                  <option value="" className="bg-card">انتخاب کنید...</option>
                  {gradeOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
                  ))}
                </select>
              </div>
              {showStudyField && (
                <div>
                  <label className="block text-ink-3 mb-2 text-sm font-medium">رشته تحصیلی</label>
                  <select value={editStudyField} onChange={(e) => setEditStudyField(e.target.value)}
                    className={`${inputClass} cursor-pointer`}>
                    <option value="" className="bg-card">انتخاب کنید...</option>
                    {studyFieldOptions.map((o) => (
                      <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-ink-3 mb-2 text-sm font-medium">فوق برنامه</label>
                <select value={editOlympiad} onChange={(e) => setEditOlympiad(e.target.value)}
                  className={`${inputClass} cursor-pointer`}>
                  <option value="" className="bg-card">انتخاب کنید...</option>
                  {extracurricularOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditProfile(false)}
                  className="flex-1 px-6 py-3 bg-panel rounded-xl hover:bg-panel-hover
                             transition font-semibold text-ink">
                  انصراف
                </button>
                <button onClick={handleSaveProfile}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600
                             rounded-xl hover:from-emerald-600 hover:to-green-700 transition
                             font-semibold shadow-lg">
                  ✓ ذخیره تغییرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* دکمه خروج — پایین صفحه، با اسکرول دیده می‌شود */}
      <div className="h-40 shrink-0" aria-hidden />
      <div className="flex justify-center px-4 pb-32">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/20
                     bg-red-950/25 px-4 py-2 text-sm font-medium text-red-400/90
                     transition hover:border-red-500/35 hover:bg-red-950/45 hover:text-red-400"
        >
          <LogOut className="size-4 shrink-0 text-red-500" strokeWidth={2} aria-hidden />
          خروج از حساب
        </button>
      </div>
      </div>

      {!showCoursesManager && !showEditProfile && !showPersonalization && <ConsultantFAB />}
      <BottomNav />
    </div>
  );
};

export default Courses;
