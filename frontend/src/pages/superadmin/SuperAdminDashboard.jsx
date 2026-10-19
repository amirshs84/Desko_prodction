import { useState, useEffect } from 'react';
import { HiPlus, HiOfficeBuilding, HiUserGroup, HiKey, HiLogout, HiChat, HiUserAdd, HiBell, HiTrash } from 'react-icons/hi';
import { superadminAPI, notificationAPI } from '../../api/client';
import SuperAdminMessages from './SuperAdminMessages';
import SuperAdminMembersModal from './SuperAdminMembersModal';
import { performLogout } from '../../utils/auth';
import { queryClient } from '../../lib/queryClient';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('schools'); // 'schools' | 'messages' | 'notifications'
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [newSchool, setNewSchool] = useState({ name: '', normal_study_threshold: 21600 });
  const [managerPhone, setManagerPhone] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerFullName, setManagerFullName] = useState('');
  const [consultantPhone, setConsultantPhone] = useState('');
  const [consultantPassword, setConsultantPassword] = useState('');
  const [consultantFullName, setConsultantFullName] = useState('');
  const [consultants, setConsultants] = useState([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentTargetSchool, setStudentTargetSchool] = useState(null);
  const [manualStudent, setManualStudent] = useState({
    phone_number: '',
    password: '',
    full_name: '',
    grade: '',
    olympiad_field: '',
    seed_demo: false,
  });
  const [seedingSchoolId, setSeedingSchoolId] = useState(null);
  const [demoResult, setDemoResult] = useState(null);
  const [demoCopied, setDemoCopied] = useState(false);

  /* ── state های نوتیفیکیشن ── */
  const [sentNotifs,      setSentNotifs]      = useState([]);
  const [notifLoading,    setNotifLoading]    = useState(false);
  const [notifForm, setNotifForm] = useState({
    title:       '',
    body:        '',
    target_type: 'all',
    school_ids:  [],
  });
  const [notifSending,  setNotifSending]  = useState(false);
  const [notifSuccess,  setNotifSuccess]  = useState('');
  const [notifError,    setNotifError]    = useState('');

  const gradeOptions = [
    { value: '', label: '—' },
    { value: '7', label: 'هفتم' },
    { value: '8', label: 'هشتم' },
    { value: '9', label: 'نهم' },
    { value: '10', label: 'دهم' },
    { value: '11', label: 'یازدهم' },
    { value: '12', label: 'دوازدهم' },
    { value: 'graduate', label: 'فارغ‌التحصیل' },
  ];

  const olympiadOptions = [
    { value: '', label: '—' },
    { value: 'math', label: 'ریاضی' },
    { value: 'physics', label: 'فیزیک' },
    { value: 'chemistry', label: 'شیمی' },
    { value: 'biology', label: 'زیست‌شناسی' },
    { value: 'computer', label: 'کامپیوتر' },
    { value: 'astronomy', label: 'نجوم' },
    { value: 'none', label: 'ندارم' },
  ];

  useEffect(() => {
    fetchSchools();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') fetchSentNotifs();
  }, [activeTab]);

  const fetchUnreadCount = async () => {
    try {
      const res = await superadminAPI.getTickets();
      setUnreadMessages(res.data.unread_count || 0);
    } catch {
      // silent
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await superadminAPI.getSchools();
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
      alert('خطا در دریافت لیست مدارس');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    try {
      await superadminAPI.createSchool(newSchool);
      alert('مدرسه با موفقیت ساخته شد');
      setShowCreateModal(false);
      setNewSchool({ name: '', normal_study_threshold: 21600 });
      fetchSchools();
    } catch (error) {
      console.error('Error creating school:', error);
      alert('خطا در ساخت مدرسه');
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    try {
      await superadminAPI.assignManager(selectedSchool.id, {
        phone_number: managerPhone.trim(),
        password: managerPassword,
        full_name: managerFullName.trim(),
      });
      alert(`مدیر با موفقیت به ${selectedSchool.name} اختصاص یافت`);
      setShowAssignModal(false);
      setManagerPhone('');
      setManagerPassword('');
      setManagerFullName('');
      fetchSchools();
    } catch (error) {
      console.error('Error assigning manager:', error);
      const msg = error.response?.data?.error
        || error.response?.data?.phone_number?.[0]
        || 'خطا در اختصاص مدیر';
      alert(msg);
    }
  };

  const openConsultantModal = async (school) => {
    setSelectedSchool(school);
    setShowConsultantModal(true);
    setConsultantPhone('');
    setConsultantPassword('');
    setConsultantFullName('');
    setConsultantsLoading(true);
    try {
      const res = await superadminAPI.getConsultants(school.id);
      setConsultants(res.data || []);
    } catch (error) {
      console.error('Error fetching consultants:', error);
      setConsultants([]);
      alert('خطا در دریافت فهرست مشاوران');
    } finally {
      setConsultantsLoading(false);
    }
  };

  const refreshConsultants = async (schoolId) => {
    const res = await superadminAPI.getConsultants(schoolId);
    setConsultants(res.data || []);
  };

  const handleAssignConsultant = async (e) => {
    e.preventDefault();
    if (!selectedSchool) return;
    try {
      await superadminAPI.assignConsultant(selectedSchool.id, {
        phone_number: consultantPhone.trim(),
        password: consultantPassword,
        full_name: consultantFullName.trim(),
      });
      alert(`مشاور با موفقیت به ${selectedSchool.name} اختصاص یافت`);
      setConsultantPhone('');
      setConsultantPassword('');
      setConsultantFullName('');
      await refreshConsultants(selectedSchool.id);
      fetchSchools();
    } catch (error) {
      console.error('Error assigning consultant:', error);
      const msg = error.response?.data?.error
        || error.response?.data?.phone_number?.[0]
        || 'خطا در اختصاص مشاور';
      alert(msg);
    }
  };

  const handleRevokeConsultant = async (phone) => {
    if (!selectedSchool) return;
    if (!confirm(`دسترسی مشاور ${phone} لغو شود؟`)) return;
    try {
      await superadminAPI.revokeConsultant(selectedSchool.id, { phone_number: phone });
      await refreshConsultants(selectedSchool.id);
    } catch (error) {
      console.error('Error revoking consultant:', error);
      const msg = error.response?.data?.error || 'خطا در لغو دسترسی مشاور';
      alert(msg);
    }
  };

  const handleCreateManualStudent = async (e) => {
    e.preventDefault();
    try {
      await superadminAPI.createStudent(studentTargetSchool.id, {
        phone_number: manualStudent.phone_number.trim(),
        password: manualStudent.password,
        full_name: manualStudent.full_name.trim(),
        grade: manualStudent.grade,
        olympiad_field: manualStudent.olympiad_field,
        seed_demo: manualStudent.seed_demo,
      });
      await queryClient.invalidateQueries({ queryKey: ['manager', 'students'] });
      await queryClient.invalidateQueries({ queryKey: ['manager', 'classes'] });
      alert(manualStudent.seed_demo
        ? 'دانش‌آموز با اطلاعات دمو ثبت شد'
        : 'دانش‌آموز با موفقیت ثبت شد');
      setShowStudentModal(false);
      setStudentTargetSchool(null);
      setManualStudent({
        phone_number: '',
        password: '',
        full_name: '',
        grade: '',
        olympiad_field: '',
        seed_demo: false,
      });
      fetchSchools();
    } catch (error) {
      console.error('Error creating student:', error);
      const d = error.response?.data;
      const msg =
        (typeof d?.error === 'string' && d.error) ||
        d?.phone_number?.[0] ||
        d?.password?.[0] ||
        (d && typeof d === 'object' ? 'ورودی‌ها را بررسی کنید' : null) ||
        'خطا در ثبت دانش‌آموز';
      alert(msg);
    }
  };

  const handleSeedDemo = async (school) => {
    const confirmed = confirm(
      `بسته دمو فروش برای «${school.name}» ساخته شود؟\nاکانت‌های دموی قبلی همین مدرسه جایگزین می‌شوند. اکانت‌های واقعی دست نمی‌خورند.`
    );
    if (!confirmed) return;
    setSeedingSchoolId(school.id);
    try {
      const res = await superadminAPI.seedDemo(school.id);
      setDemoCopied(false);
      setDemoResult(res.data);
      fetchSchools();
    } catch (error) {
      const msg = error.response?.data?.error || 'خطا در ساخت بسته دمو';
      alert(msg);
    } finally {
      setSeedingSchoolId(null);
    }
  };

  const demoCredentialsText = (result) => {
    if (!result) return '';
    const lines = [
      `مدرسه: ${schools.find((s) => s.id === result.school_id)?.name || ''}`,
      `رمز اکانت‌های تازه‌ساخته: ${result.password}`,
      '',
    ];
    if (result.manager?.created) {
      lines.push(`مدیر: ${result.manager.full_name} — ${result.manager.username}`);
    } else if (result.manager) {
      lines.push(`مدیر واقعی حفظ شد: ${result.manager.full_name} — ${result.manager.username} (رمز قبلی)`);
    }
    if (result.consultant) {
      lines.push(`مشاور: ${result.consultant.full_name} — ${result.consultant.username}`);
    }
    if (result.class_name) lines.push(`کلاس: ${result.class_name}`);
    lines.push('', 'دانش‌آموزها:');
    (result.students || []).forEach((student) => {
      lines.push(`${student.full_name} (${student.tier_label}) — ${student.username}`);
    });
    return lines.join('\n');
  };

  const copyDemoCredentials = async () => {
    try {
      await navigator.clipboard.writeText(demoCredentialsText(demoResult));
      setDemoCopied(true);
    } catch {
      alert('کپی ممکن نشد. مشخصات را دستی بردارید.');
    }
  };

  const handleDeleteSchool = async (school) => {
    if (!confirm(`آیا از حذف مدرسه ${school.name} اطمینان دارید؟`)) return;

    try {
      await superadminAPI.deleteSchool(school.id);
      alert('مدرسه حذف شد');
      fetchSchools();
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('خطا در حذف مدرسه');
    }
  };

  const formatHours = (seconds) => {
    return (seconds / 3600).toFixed(1);
  };

  /* ── توابع نوتیفیکیشن ── */
  const fetchSentNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await notificationAPI.getSentList();
      setSentNotifs(res.data);
    } catch { /* silent */ } finally {
      setNotifLoading(false);
    }
  };

  const handleSendNotif = async (e) => {
    e.preventDefault();
    setNotifError('');
    setNotifSuccess('');
    const schoolTargets = ['school_all', 'school_students'];
    if (schoolTargets.includes(notifForm.target_type) && notifForm.school_ids.length === 0) {
      setNotifError('لطفاً حداقل یک مدرسه انتخاب کنید');
      return;
    }
    setNotifSending(true);
    try {
      await notificationAPI.sendNotification(notifForm);
      setNotifSuccess('نوتیفیکیشن با موفقیت ارسال شد ✓');
      setNotifForm({ title: '', body: '', target_type: 'all', school_ids: [] });
      fetchSentNotifs();
    } catch (err) {
      const d = err.response?.data;
      setNotifError(
        d?.title?.[0] || d?.body?.[0] || d?.school_ids?.[0] || d?.non_field_errors?.[0] || 'خطا در ارسال'
      );
    } finally {
      setNotifSending(false);
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('این نوتیفیکیشن حذف شود؟')) return;
    try {
      await notificationAPI.deleteNotification(id);
      setSentNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch { alert('خطا در حذف'); }
  };

  const toggleSchoolId = (id) => {
    setNotifForm((prev) => ({
      ...prev,
      school_ids: prev.school_ids.includes(id)
        ? prev.school_ids.filter((s) => s !== id)
        : [...prev.school_ids, id],
    }));
  };

  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 flex items-center justify-center">
        <div className="text-purple-800 flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-purple-800 border-t-transparent rounded-full animate-spin" />
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 bg-white text-gray-900 relative z-10 pb-20">
    
    {/* Header with Gradient */}
    <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sticky top-0 z-20 shadow-2xl backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">پنل سوپرادمین</h1>
            <p className="text-purple-100 text-sm font-medium">مدیریت مدارس و دسترسی‌ها</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {activeTab === 'schools' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition-all font-bold flex items-center gap-2 shadow-lg hover:scale-105 transform"
              >
                <HiPlus className="text-xl" />
                افزودن مدرسه جدید
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-bold flex items-center gap-2 border border-white/20 backdrop-blur-sm"
            >
              <HiLogout className="text-xl" />
              خروج
            </button>
          </div>
      </div>
    </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* تب‌های اصلی */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('schools')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'schools'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HiOfficeBuilding className="text-lg" />
            مدارس
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
              activeTab === 'messages'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HiChat className="text-lg" />
            تیکت‌های پشتیبانی
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-black">
                {unreadMessages}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'notifications'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HiBell className="text-lg" />
            ارسال اعلان
          </button>
        </div>

        {/* محتوای تب پیام‌ها */}
        {activeTab === 'messages' && <SuperAdminMessages />}

        {/* محتوای تب اعلان‌ها */}
        {activeTab === 'notifications' && (
          <SuperAdminNotificationPanel
            schools={schools}
            notifForm={notifForm}
            setNotifForm={setNotifForm}
            notifSending={notifSending}
            notifSuccess={notifSuccess}
            notifError={notifError}
            sentNotifs={sentNotifs}
            notifLoading={notifLoading}
            onSend={handleSendNotif}
            onDelete={handleDeleteNotif}
            onToggleSchool={toggleSchoolId}
          />
        )}

        {/* محتوای تب مدارس */}
        {activeTab === 'schools' && (
          <div>
        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <div
              key={school.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
            >
              {/* School Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <HiOfficeBuilding className="text-2xl text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{school.name}</h3>
                      {school.is_demo && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          دمو
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{school.member_count} دانش‌آموز</p>
                  </div>
                </div>
              </div>

              {/* Invitation Code */}
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">کد دعوت:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-purple-700 tracking-widest">
                      {school.invitation_code}
                    </span>
                    <HiKey className="text-purple-600 text-lg" />
                  </div>
                </div>
              </div>

              {/* Manager Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <HiUserGroup className="text-gray-400" />
                  <span className="text-gray-600">مدیر:</span>
                  <span className="font-semibold text-gray-900">{school.manager_name}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-600">حد نرمال مطالعه:</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatHours(school.normal_study_threshold)} ساعت
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchool(school);
                      setShowAssignModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
                  >
                    تعیین مدیر
                  </button>
                  <button
                    type="button"
                    onClick={() => openConsultantModal(school)}
                    className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold text-sm"
                  >
                    تعیین مشاور
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentTargetSchool(school);
                    setShowStudentModal(true);
                  }}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <HiUserAdd className="text-lg shrink-0" />
                  ثبت دانش‌آموز
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchool(school);
                    setShowMembersModal(true);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <HiUserGroup className="text-lg shrink-0" />
                  مشاهده و ویرایش اعضا
                </button>
                <button
                  type="button"
                  onClick={() => handleSeedDemo(school)}
                  disabled={seedingSchoolId === school.id}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold text-sm disabled:opacity-60"
                >
                  {seedingSchoolId === school.id ? 'در حال ساخت بسته دمو…' : 'ساخت بسته دمو فروش'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSchool(school)}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                >
                  حذف مدرسه
                </button>
              </div>
            </div>
          ))}
        </div>

        {schools.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <HiOfficeBuilding className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">هیچ مدرسه‌ای ثبت نشده است</p>
            <p className="text-sm">برای شروع، یک مدرسه جدید اضافه کنید</p>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Create School Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">افزودن مدرسه جدید</h2>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام مدرسه</label>
                <input
                  type="text"
                  value={newSchool.name}
                  onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                  placeholder="مثال: دبیرستان فرزانگان"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">حد نرمال مطالعه (ساعت)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newSchool.normal_study_threshold / 3600}
                  onChange={(e) => setNewSchool({ ...newSchool, normal_study_threshold: parseFloat(e.target.value) * 3600 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                >
                  ایجاد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* افزودن دانش‌آموز دستی */}
      {showStudentModal && studentTargetSchool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">افزودن دانش‌آموز</h2>
            <p className="text-gray-600 text-sm mb-6">مدرسه: {studentTargetSchool.name}</p>
            <form onSubmit={handleCreateManualStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام کاربری</label>
                <input
                  type="text"
                  dir="ltr"
                  value={manualStudent.phone_number}
                  onChange={(e) => setManualStudent({ ...manualStudent, phone_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  required
                  maxLength={150}
                  placeholder="نام کاربری یا شماره موبایل"
                />
                <p className="text-xs text-gray-500 mt-1">حروف انگلیسی، عدد و علامت‌های خاص مجاز است</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رمز عبور</label>
                <input
                  type="password"
                  value={manualStudent.password}
                  onChange={(e) => setManualStudent({ ...manualStudent, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={manualStudent.full_name}
                  onChange={(e) => setManualStudent({ ...manualStudent, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">پایه</label>
                <select
                  value={manualStudent.grade}
                  onChange={(e) => setManualStudent({ ...manualStudent, grade: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                  value={manualStudent.olympiad_field}
                  onChange={(e) => setManualStudent({ ...manualStudent, olympiad_field: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {olympiadOptions.map((o) => (
                    <option key={o.value || 'empty-olympiad'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualStudent.seed_demo}
                  onChange={(e) => setManualStudent({ ...manualStudent, seed_demo: e.target.checked })}
                  className="mt-1 accent-amber-600 w-4 h-4"
                />
                <span>
                  <span className="block text-sm font-semibold text-amber-900">پر کردن اطلاعات دمو</span>
                  <span className="block text-xs text-amber-800/80 mt-0.5">
                    درس، ساعت مطالعهٔ چهار هفته و تقویم دو هفته برای همین دانش‌آموز ساخته می‌شود.
                  </span>
                </span>
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentModal(false);
                    setStudentTargetSchool(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold"
                >
                  ثبت دانش‌آموز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Manager Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تعیین مدیر</h2>
            <p className="text-gray-600 text-sm mb-6">مدرسه: {selectedSchool?.name}</p>
            <form onSubmit={handleAssignManager} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام کاربری مدیر</label>
                <input
                  type="text"
                  dir="ltr"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  required
                  placeholder="نام کاربری یا شماره موبایل"
                  maxLength={150}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={managerFullName}
                  onChange={(e) => setManagerFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رمز عبور</label>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="new-password"
                  placeholder="اختیاری؛ اگر خالی باشد در ورود اول تعیین می‌شود"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setManagerPhone('');
                    setManagerPassword('');
                    setManagerFullName('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                >
                  تعیین
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Consultant Modal */}
      {showConsultantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تعیین مشاور</h2>
            <p className="text-gray-600 text-sm mb-4">مدرسه: {selectedSchool?.name}</p>
            <p className="text-xs text-gray-500 mb-4">
              هر مدرسه می‌تواند چند مشاور داشته باشد. اگر رمز را همین‌جا وارد کنید، مشاور بلافاصله می‌تواند وارد شود.
            </p>

            <form onSubmit={handleAssignConsultant} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام کاربری مشاور</label>
                <input
                  type="text"
                  dir="ltr"
                  value={consultantPhone}
                  onChange={(e) => setConsultantPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  required
                  placeholder="نام کاربری یا شماره موبایل"
                  maxLength={150}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={consultantFullName}
                  onChange={(e) => setConsultantFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رمز عبور</label>
                <input
                  type="password"
                  value={consultantPassword}
                  onChange={(e) => setConsultantPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoComplete="new-password"
                  placeholder="اختیاری؛ اگر خالی باشد در ورود اول تعیین می‌شود"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-semibold"
              >
                افزودن مشاور
              </button>
            </form>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">مشاوران فعلی</h3>
              {consultantsLoading && (
                <p className="text-sm text-gray-400">در حال بارگذاری…</p>
              )}
              {!consultantsLoading && consultants.length === 0 && (
                <p className="text-sm text-gray-400">هنوز مشاوری تعیین نشده است</p>
              )}
              <ul className="space-y-2">
                {consultants.map((c) => (
                  <li
                    key={c.user_id || c.phone_number}
                    className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.full_name || 'بدون نام'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{c.phone_number}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {c.is_password_set ? 'رمز تنظیم شده' : 'در انتظار تعیین رمز'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeConsultant(c.phone_number)}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      لغو
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowConsultantModal(false);
                setConsultantPhone('');
                setConsultantPassword('');
                setConsultantFullName('');
                setConsultants([]);
              }}
              className="w-full mt-6 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {showMembersModal && selectedSchool && (
        <SuperAdminMembersModal
          school={selectedSchool}
          gradeOptions={gradeOptions}
          olympiadOptions={olympiadOptions}
          onClose={() => setShowMembersModal(false)}
          onChanged={fetchSchools}
        />
      )}

      {demoResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">بسته دمو آماده است</h2>
            <p className="text-sm text-gray-600 mb-4">
              رمز اکانت‌های تازه‌ساخته: <span className="font-mono font-bold text-amber-800" dir="ltr">{demoResult.password}</span>
            </p>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 leading-7">
              {demoCredentialsText(demoResult)}
            </pre>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={copyDemoCredentials}
                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold"
              >
                {demoCopied ? 'کپی شد' : 'کپی مشخصات'}
              </button>
              <button
                type="button"
                onClick={() => setDemoResult(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   کامپوننت پنل ارسال اعلان (سوپرادمین)
══════════════════════════════════════════════════════════ */
const TARGET_LABELS = {
  all:              'همه کاربران (دانش‌آموز + مدیر)',
  all_students:     'همه دانش‌آموزان',
  school_all:       'مدارس خاص – همه اعضا',
  school_students:  'مدارس خاص – فقط دانش‌آموزان',
};

function SuperAdminNotificationPanel({
  schools, notifForm, setNotifForm, notifSending, notifSuccess, notifError,
  sentNotifs, notifLoading, onSend, onDelete, onToggleSchool,
}) {
  const needsSchools = ['school_all', 'school_students'].includes(notifForm.target_type);

  return (
    <div className="space-y-8" style={{ direction: 'rtl' }}>

      {/* ── فرم ارسال ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600
                          rounded-xl flex items-center justify-center shadow-lg">
            <HiBell className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">ارسال اعلان جدید</h2>
            <p className="text-sm text-gray-500">اعلان فوری برای کاربران اپ</p>
          </div>
        </div>

        <form onSubmit={onSend} className="space-y-5">
          {/* عنوان */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              عنوان اعلان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              required
              value={notifForm.title}
              onChange={(e) => setNotifForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="مثلاً: آزمون فردا برگزار می‌شود"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{notifForm.title.length}/200</p>
          </div>

          {/* متن */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              متن اعلان <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={notifForm.body}
              onChange={(e) => setNotifForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="متن کامل اعلان را بنویسید..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white resize-none"
            />
          </div>

          {/* نوع مخاطب */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              مخاطبان اعلان <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(TARGET_LABELS).map(([val, label]) => (
                <label
                  key={val}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer
                               transition-all ${
                    notifForm.target_type === val
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="target_type"
                    value={val}
                    checked={notifForm.target_type === val}
                    onChange={(e) =>
                      setNotifForm((p) => ({ ...p, target_type: e.target.value, school_ids: [] }))
                    }
                    className="accent-purple-600"
                  />
                  <span className={`text-sm font-semibold ${
                    notifForm.target_type === val ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* انتخاب مدارس */}
          {needsSchools && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 animate-fadeIn">
              <p className="text-sm font-bold text-purple-700 mb-3">
                مدارس مورد نظر را انتخاب کنید:
              </p>
              {schools.length === 0 ? (
                <p className="text-sm text-gray-500">هیچ مدرسه‌ای یافت نشد</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                  {schools.map((sc) => (
                    <label
                      key={sc.id}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer
                                  transition-all ${
                        notifForm.school_ids.includes(sc.id)
                          ? 'border-purple-500 bg-white shadow-sm'
                          : 'border-gray-200 bg-white/60 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={notifForm.school_ids.includes(sc.id)}
                        onChange={() => onToggleSchool(sc.id)}
                        className="accent-purple-600 w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{sc.name}</p>
                        <p className="text-xs text-gray-500">{sc.member_count} دانش‌آموز</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {notifForm.school_ids.length > 0 && (
                <p className="text-xs text-purple-600 mt-2 font-semibold">
                  {notifForm.school_ids.length} مدرسه انتخاب شده
                </p>
              )}
            </div>
          )}

          {/* پیام‌های وضعیت */}
          {notifError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            rounded-xl px-4 py-3 text-red-700 text-sm font-semibold">
              ⚠️ {notifError}
            </div>
          )}
          {notifSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200
                            rounded-xl px-4 py-3 text-green-700 text-sm font-semibold">
              {notifSuccess}
            </div>
          )}

          {/* دکمه ارسال */}
          <button
            type="submit"
            disabled={notifSending}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white
                       rounded-xl font-bold text-base hover:from-purple-700 hover:to-indigo-700
                       transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {notifSending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent
                                rounded-full animate-spin" />
                در حال ارسال...
              </>
            ) : (
              <>
                <HiBell className="text-xl" />
                ارسال اعلان
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── تاریخچه ارسال‌ها ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          تاریخچه اعلان‌های ارسال‌شده
          {sentNotifs.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-black
                             px-2 py-0.5 rounded-full">
              {sentNotifs.length}
            </span>
          )}
        </h2>

        {notifLoading ? (
          <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent
                            rounded-full animate-spin" />
            در حال بارگذاری...
          </div>
        ) : sentNotifs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <HiBell className="text-5xl mx-auto mb-3 opacity-30" />
            <p>هنوز اعلانی ارسال نشده است</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentNotifs.map((notif) => (
              <div
                key={notif.id}
                className="flex items-start gap-4 p-4 bg-gray-50/80 rounded-xl
                           border border-gray-200/50 hover:bg-gray-100/80 transition-all"
              >
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center
                                justify-center shrink-0 mt-0.5">
                  <HiBell className="text-purple-600 text-base" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{notif.title}</h3>
                    <button
                      onClick={() => onDelete(notif.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold
                                 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200
                                 rounded-lg transition-all shrink-0"
                      title="حذف اعلان"
                    >
                      <HiTrash className="text-sm" />
                      حذف
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.body}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700
                                     px-2 py-0.5 rounded-full text-xs font-semibold">
                      {notif.target_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {notif.reach_count} نفر دریافت‌کننده
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                  {notif.target_schools?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {notif.target_schools.map((sc) => (
                        <span key={sc.id}
                          className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full border border-indigo-100">
                          {sc.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
