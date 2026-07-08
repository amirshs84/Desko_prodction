import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ConsultantFAB from '../components/ConsultantFAB';
import { performLogout } from '../utils/auth';

const Home = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const profileComplete = localStorage.getItem('profileComplete');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn || profileComplete !== 'true') { navigate('/login'); return; }
    setUserName(localStorage.getItem('userName') || 'Student');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center
                    relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />

      <div className="relative z-10 text-center w-full max-w-md">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400
                       to-purple-500 bg-clip-text text-transparent pb-2">
          تایمر مطالعه
        </h1>
        <p className="text-ink-3 mb-12 text-lg">{userName}، خوش آمدید!</p>

        <div className="space-y-4">
          <button onClick={() => navigate('/study-timer')}
            className="w-full p-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl
                       hover:from-blue-700 hover:to-purple-700 transition-all duration-300
                       transform hover:scale-105 shadow-2xl shadow-blue-500/30">
            <div className="text-5xl mb-3">⏱️</div>
            <h2 className="text-2xl font-bold mb-2">شروع تایمر</h2>
            <p className="text-gray-200 text-sm">یک جلسه مطالعه جدید شروع کنید</p>
          </button>

          <button onClick={() => navigate('/dashboard')}
            className="w-full p-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl
                       hover:from-purple-700 hover:to-pink-700 transition-all duration-300
                       transform hover:scale-105 shadow-2xl shadow-purple-500/30">
            <div className="text-5xl mb-3">📊</div>
            <h2 className="text-2xl font-bold mb-2">داشبورد</h2>
            <p className="text-gray-200 text-sm">آمار مطالعه خود را مشاهده کنید</p>
          </button>

          <button onClick={() => navigate('/courses')}
            className="w-full p-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl
                       hover:from-emerald-700 hover:to-teal-700 transition-all duration-300
                       transform hover:scale-105 shadow-2xl shadow-emerald-500/30">
            <div className="text-5xl mb-3">📚</div>
            <h2 className="text-2xl font-bold mb-2">درس‌های من</h2>
            <p className="text-gray-200 text-sm">موضوعات خود را مدیریت کنید</p>
          </button>
        </div>

        <button
          onClick={() => {
            if (window.confirm('آیا از خروج از حساب کاربری مطمئن هستید؟')) {
              performLogout();
            }
          }}
          className="mt-8 text-ink-4 hover:text-ink-2 transition">
          خروج
        </button>
      </div>

      <ConsultantFAB />
    </div>
  );
};

export default Home;
