import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerAPI } from '../../api/client';
import KPICard from '../../components/manager/KPICard';
import TrendIndicator from '../../components/manager/TrendIndicator';
import ManagerMessages from './ManagerMessages';
import { performLogout } from '../../utils/auth';
import { getIranDate } from '../../utils/dateUtils';
import { downloadBlob } from '../../utils/download';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { 
  HiAcademicCap, 
  HiExclamationCircle, 
  HiUserGroup,
  HiSearch,
  HiDownload,
  HiFilter,
  HiStar,
  HiLogout,
  HiChat,
  HiRefresh,
  HiCheckCircle,
  HiInformationCircle
} from 'react-icons/hi';
import { MdOutlineInstallMobile, MdSystemUpdate } from 'react-icons/md';
import { usePWA } from '../../hooks/PWAContext';
import NotificationBell from '../../components/NotificationBell';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { isStandalone } = usePWA();
  const [kpiData, setKpiData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'messages' | 'update'
  const [unreadMessages, setUnreadMessages] = useState(0);
  const {
    currentVersion, latestVersion, latestData,
    hasUpdate, checking, checked, error,
    checkForUpdate,
  } = useAppUpdate();
  const [filters, setFilters] = useState({
    grade: '',
    olympiad: '',
    search: ''
  });
  // Olympiad field mapping to Persian
  const olympiadMapping = {
    'math': 'ریاضی',
    'physics': 'فیزیک',
    'chemistry': 'شیمی',
    'biology': 'زیست‌شناسی',
    'computer': 'کامپیوتر',
    'astronomy': 'نجوم',
    'literature': 'ادبیات',
    'none': '-'
  };

  const getOlympiadPersian = (field) => {
    return olympiadMapping[field] || field || '-';
  };

  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchUnreadCount = async () => {
    try {
      const res = await managerAPI.getTickets();
      setUnreadMessages(res.data.unread_count || 0);
    } catch {
      // silent
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await managerAPI.getDashboardKPI();
      setKpiData(response.data);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      if (error.response?.status === 403) {
        alert('شما دسترسی به پنل مدیریت ندارید');
        navigate('/');
      }
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await managerAPI.getStudentList(filters);
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleExportExcel = async () => {
    const today = getIranDate();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDate = thirtyDaysAgo.toLocaleDateString('en-CA');
    const endDate = today.toLocaleDateString('en-CA');

    try {
      const response = await managerAPI.exportExcelBlob({
        start_date: startDate,
        end_date: endDate,
      });
      const blob = response.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        alert('فایلی دریافت نشد.');
        return;
      }

      const fileName = `students_${startDate}_${endDate}.xlsx`;
      await downloadBlob(blob, fileName);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Excel export error:', err);
      const msg = err.response?.status === 401
        ? 'نشست نامعتبر است؛ لطفاً دوباره وارد شوید.'
        : 'خطا در دانلود فایل اکسل';
      alert(msg);
    }
  };

  const handleStudentClick = (userId) => {
    navigate(`/manager/student/${userId}`);
  };

  // Get performance color based on threshold (6 hours = 21600 seconds)
  const getPerformanceColor = (todayTotal) => {
    const normalThreshold = 21600; // 6 hours
    if (todayTotal < normalThreshold * 0.5) return 'bg-red-50/80';
    if (todayTotal < normalThreshold) return 'bg-yellow-50/80';
    return '';
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '؟';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  // Get avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-teal-500 to-teal-600',
    ];
    const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!kpiData) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 flex items-center justify-center">
        <div className="text-emerald-800 flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  return (
       <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 bg-white text-gray-900 relative z-10 pb-20">
    
    {/* Header with Gradient */}
    <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sticky top-0 z-20 shadow-2xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* بخش عناوین (سمت راست) */}
      <div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">پنل مدیریت</h1>
        <p className="text-emerald-100 text-sm font-medium">نمای کلی عملکرد دانش‌آموزان</p>
      </div>

      {/* بخش دکمه‌های عملیاتی (سمت چپ) */}
      <div className="flex items-center gap-2">
        {/* زنگوله اعلان */}
        <NotificationBell variant="light" />

        {!isStandalone && (
          <button
            type="button"
            onClick={() => navigate('/install-app')}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20
                       rounded-xl transition-all backdrop-blur-sm border border-white/20"
            title="نصب اپ"
          >
            <MdOutlineInstallMobile className="text-xl" />
          </button>
        )}

        {/* دکمه خروج */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20
                     rounded-xl transition-all backdrop-blur-sm border border-white/20"
          title="خروج از حساب"
        >
          <HiLogout className="text-xl" />
        </button>
      </div>

    </div>
  </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* تب‌های اصلی */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HiUserGroup className="text-lg" />
            دانش‌آموزان
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
              activeTab === 'messages'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HiChat className="text-lg" />
            پیام‌های دانش‌آموزان
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-black">
                {unreadMessages}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('update')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
              activeTab === 'update'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MdSystemUpdate className="text-lg" />
            آپدیت اپ
            {hasUpdate && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-black">!</span>
            )}
          </button>
        </div>

        {/* محتوای تب پیام‌ها */}
        {activeTab === 'messages' && <ManagerMessages />}

        {/* محتوای تب آپدیت */}
        {activeTab === 'update' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-6 py-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MdSystemUpdate className="text-xl" />
                  مدیریت آپدیت اپلیکیشن
                </h2>
                <p className="text-emerald-100 text-sm mt-1">بررسی و مدیریت نسخه‌های اپ دسکو</p>
              </div>

              {/* نسخه فعلی */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <HiInformationCircle className="text-emerald-600 text-xl" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">نسخه نصب‌شده روی سرور</p>
                    <p className="text-sm text-gray-500 font-mono mt-0.5">{currentVersion ?? '...'}</p>
                  </div>
                </div>
                {checked && !hasUpdate && (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <HiCheckCircle className="text-base" />
                    به‌روز است
                  </span>
                )}
                {hasUpdate && latestVersion && (
                  <span className="text-sm bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full font-bold">
                    نسخه {latestVersion} موجود است
                  </span>
                )}
              </div>

              {/* آخرین نسخه */}
              {latestVersion && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <MdSystemUpdate className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">آخرین نسخه سرور</p>
                      <p className="text-sm text-gray-500 font-mono mt-0.5">{latestVersion}</p>
                    </div>
                  </div>
                  {hasUpdate && (
                    <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold">
                      آپدیت لازم است
                    </span>
                  )}
                </div>
              )}

              {/* دکمه بررسی آپدیت */}
              <div className="px-6 py-5">
                <button
                  onClick={checkForUpdate}
                  disabled={checking}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5
                             bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                             rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all
                             font-bold shadow-lg disabled:opacity-60 active:scale-[0.98]"
                >
                  {checking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      در حال بررسی...
                    </>
                  ) : (
                    <>
                      <HiRefresh className="text-xl" />
                      بررسی آپدیت
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-center text-red-500 text-sm mt-3 font-medium">{error}</p>
                )}
                {checked && !hasUpdate && (
                  <p className="text-center text-emerald-600 text-sm mt-3 font-medium">✓ اپ به‌روز است — نسخه جدیدی یافت نشد</p>
                )}
              </div>
            </div>

            {/* اطلاعات changelog */}
            {hasUpdate && latestData?.changes && latestData.changes.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">تغییرات نسخه {latestVersion}</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  {latestData.changes.map((section, i) => (
                    <div key={i}>
                      <p className="text-sm font-bold text-emerald-700 mb-2">{section.category}</p>
                      <ul className="space-y-1.5">
                        {section.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50/80 border border-blue-200/50 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-blue-800 text-sm font-medium">
                💡 برای به‌روزرسانی اپ، فایل <code className="bg-blue-100 px-1 rounded font-mono">version.json</code> سرور را به نسخه جدید تغییر دهید
              </p>
            </div>
          </div>
        )}

        {activeTab === 'students' && <>
        {/* KPI Cards with Modern Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="میانگین مطالعه امروز"
            value={kpiData.avg_study_today}
            subtitle={`${kpiData.total_students} دانش‌آموز`}
            icon={HiAcademicCap}
            trend={kpiData.change_percent}
            colorClass="from-emerald-600/90 to-teal-700/90"
          />
          
          <KPICard
            title="فعال‌ترین دانش‌آموز"
            value={kpiData.top_student.name}
            subtitle={formatSeconds(kpiData.top_student.total)}
            icon={HiStar}
            colorClass="from-amber-500/90 to-orange-600/90"
          />
          
          <KPICard
            title="غایبین امروز"
            value={kpiData.absent_count}
            subtitle="دانش‌آموز"
            icon={HiExclamationCircle}
            colorClass={kpiData.absent_count > 0 ? 'from-red-500/90 to-rose-600/90' : 'from-emerald-600/90 to-teal-700/90'}
          />
          
          <KPICard
            title="در حال مطالعه"
            value={kpiData.active_now}
            subtitle="دانش‌آموز فعال"
            icon={HiUserGroup}
            colorClass="from-blue-600/90 to-indigo-700/90"
          />
        </div>

        {/* Filters with Modern Toolbar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-5 mb-6">
          <div className="flex flex-col gap-3">
            {/* سطر اول: جستجو */}
            <div className="relative">
              <HiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="جستجوی نام یا شماره..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
              />
            </div>

            {/* پایه و رشته همیشه در یک سطر؛ دکمه اکسل زیر آن در باریک یا بغل */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-row gap-2 w-full min-w-0 sm:flex-1">
                {/* Grade */}
                <div className="relative flex-1 min-w-0">
                  <HiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                  <select
                    value={filters.grade}
                    onChange={(e) => setFilters({...filters, grade: e.target.value})}
                    className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer bg-white/50 backdrop-blur-sm font-medium text-sm"
                  >
                    <option value="">همه پایه‌ها</option>
                    <option value="7">هفتم</option>
                    <option value="8">هشتم</option>
                    <option value="9">نهم</option>
                    <option value="10">دهم</option>
                    <option value="11">یازدهم</option>
                    <option value="12">دوازدهم</option>
                  </select>
                </div>

                {/* Olympiad */}
                <div className="relative flex-1 min-w-0">
                  <select
                    value={filters.olympiad}
                    onChange={(e) => setFilters({...filters, olympiad: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer bg-white/50 backdrop-blur-sm font-medium text-sm"
                  >
                    <option value="">همه رشته‌ها</option>
                    <option value="math">ریاضی</option>
                    <option value="physics">فیزیک</option>
                    <option value="chemistry">شیمی</option>
                    <option value="biology">زیست‌شناسی</option>
                    <option value="computer">کامپیوتر</option>
                    <option value="astronomy">نجوم</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleExportExcel}
                type="button"
                className="w-full sm:w-auto shrink-0 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                <HiDownload className="text-lg" />
                <span className="hidden sm:inline">دانلود Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Students Table with Modern Design */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-right font-bold">دانش‌آموز</th>
                  <th className="px-4 py-4 text-center font-bold">پایه</th>
                  <th className="px-4 py-4 text-center font-bold">رشته</th>
                  <th className="px-4 py-4 text-center font-bold">امروز</th>
                  <th className="px-4 py-4 text-center font-bold">هفته</th>
                  <th className="px-4 py-4 text-center font-bold">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        در حال بارگذاری...
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                      دانش‌آموزی یافت نشد
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr
                      key={student.user_id}
                      onClick={() => handleStudentClick(student.user_id)}
                      className={`cursor-pointer transition-all duration-200
                        ${getPerformanceColor(student.today_total)}
                        hover:bg-emerald-50 hover:shadow-lg hover:scale-[1.01] transform
                        ${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white/30'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-full ${getAvatarColor(student.full_name)} 
                                        flex items-center justify-center text-white font-bold text-sm
                                        shadow-lg ring-2 ring-white`}>
                            {getInitials(student.full_name)}
                          </div>
                          {/* Name */}
                          <div>
                            <div className="font-bold text-gray-900 text-base">
                              {student.full_name || student.phone_number}
                            </div>
                            {student.full_name && (
                              <div className="text-xs text-gray-500 font-mono">{student.phone_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                          {student.grade ? `${student.grade}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600 text-sm font-medium">
                        {getOlympiadPersian(student.olympiad_field)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-bold text-gray-900 text-base">
                          {formatSeconds(student.today_total)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono font-bold text-gray-900 text-base">
                            {formatSeconds(student.week_total)}
                          </span>
                          <TrendIndicator trend={student.trend} percent={student.trend_percent} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm
                          ${student.trend === 'up' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                            student.trend === 'down' ? 'bg-red-100 text-red-700 ring-1 ring-red-200' :
                            'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
                          {student.trend === 'up' ? '🔥 صعودی' : student.trend === 'down' ? '📉 نزولی' : '➖ ثابت'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note with Modern Design */}
        <div className="mt-6 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-blue-800 text-sm font-medium">
            💡 دانش‌آموزانی با مطالعه کمتر از ۳ ساعت با رنگ قرمز و کمتر از ۶ ساعت با رنگ زرد مشخص شده‌اند
          </p>
        </div>
        </>}
      </div>
    </div>
  );
}
