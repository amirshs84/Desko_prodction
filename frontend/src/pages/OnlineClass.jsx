import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { onlineClassAPI } from '../api/client';

const OnlineClass = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      navigate('/login');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await onlineClassAPI.getMyClasses();
        if (!cancelled) {
          setClasses(data.online_classes || []);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.error || 'خطا در دریافت کلاس‌های آنلاین';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  const handleJoin = useCallback(async (classId) => {
    setJoiningId(classId);
    setError('');
    try {
      const { data } = await onlineClassAPI.joinClass(classId);
      if (data.login_url) {
        window.open(data.login_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'خطا در ورود به کلاس آنلاین';
      setError(msg);
    } finally {
      setJoiningId(null);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg text-ink">
      <div
        className="flex shrink-0 items-center justify-between border-b border-edge bg-card px-4 pb-4"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <Link
          to="/timer"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-brand hover:bg-panel"
        >
          بازگشت
        </Link>
        <h1 className="text-lg font-bold text-ink">کلاس آنلاین</h1>
        <div className="w-14 shrink-0" aria-hidden />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-nav-safe">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-3">
            <div className="text-4xl mb-4 animate-pulse">📹</div>
            <p className="text-sm">در حال بارگذاری...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && classes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-6">📹</div>
            <h2 className="text-xl font-bold text-ink-2 mb-2">کلاس آنلاینی ندارید</h2>
            <p className="text-sm text-ink-3 leading-relaxed max-w-sm">
              پس از تخصیص کلاس آنلاین توسط مدیر مدرسه، اینجا نمایش داده می‌شود.
            </p>
          </div>
        )}

        {!loading && classes.length > 0 && (
          <div className="space-y-3">
            {classes.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-edge bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-ink truncate">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink-3">
                      {item.school_class_name}
                      {item.grade_display ? ` · ${item.grade_display}` : ''}
                    </p>
                    {item.school_class_code && (
                      <p className="mt-0.5 text-xs text-ink-3">کد: {item.school_class_code}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoin(item.id)}
                  disabled={!item.is_active || joiningId === item.id}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {joiningId === item.id ? 'در حال آماده‌سازی...' : 'ورود به کلاس آنلاین'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OnlineClass;
