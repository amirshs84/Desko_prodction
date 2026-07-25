import { useNavigate } from 'react-router-dom';
import { LogOut, School } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { Card, DangerButton, SecondaryButton } from '../components/DemoUi';
import { performLogout } from '../../../../utils/auth';

function profile() {
  try {
    return JSON.parse(localStorage.getItem('userProfile') || '{}');
  } catch {
    return {};
  }
}

function SettingsBody() {
  const navigate = useNavigate();
  const p = profile();

  const onLogout = async () => {
    if (!window.confirm('آیا می‌خواهید خارج شوید؟')) return;
    await performLogout();
    navigate('/login');
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">تنظیمات</h2>
        <p className="text-sm text-gray-500 mt-1">حداقل تنظیمات حساب مشاور</p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center">
            <School size={18} className="text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{p.full_name || 'مشاور'}</p>
            <p className="text-xs text-gray-500 mt-1">{p.phone_number || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">
              مدرسه: {p.school_name || p.school?.name || '—'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-gray-600 mb-4">
          برای مدیریت گروهی و تقویم دانش‌آموزان از تب‌های اصلی استفاده کنید.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => navigate('/consultant')}>بازگشت به داشبورد</SecondaryButton>
          <DangerButton onClick={onLogout} className="inline-flex items-center gap-2">
            <LogOut size={16} /> خروج
          </DangerButton>
        </div>
      </Card>
    </div>
  );
}

export function SettingsDesktop() {
  return (
    <DesktopPageShell title="تنظیمات">
      <SettingsBody />
    </DesktopPageShell>
  );
}

export function SettingsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <SettingsBody />
    </MobilePageShell>
  );
}
