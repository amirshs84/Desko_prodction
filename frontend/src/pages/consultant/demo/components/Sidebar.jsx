import { GraduationCap, X, LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../constants/navItems';
import { performLogout } from '../../../../utils/auth';

function profileLabel() {
  try {
    const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return p.full_name || p.phone_number || 'مشاور';
  } catch {
    return 'مشاور';
  }
}

export default function Sidebar({ activeItem, onNavigate, onClose }) {
  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    onClose?.();
    await performLogout();
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#fff', borderLeft: '1px solid #E5E7EB' }}
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#059669' }}
        >
          <GraduationCap size={22} color="#fff" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-base leading-tight">دسکو</p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">پنل مشاور</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto p-1 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X size={20} color="#9CA3AF" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-right"
              style={{
                background: isActive ? '#ECFDF5' : 'transparent',
                color: isActive ? '#047857' : '#6B7280',
              }}
            >
              <Icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div
                  className="mr-auto w-1.5 h-5 rounded-full"
                  style={{ background: '#059669' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-gray-100 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right hover:bg-red-50"
          style={{ color: '#DC2626' }}
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">خروج از حساب</span>
        </button>
      </div>

      <div className="px-4 py-4 border-t border-gray-100">
        <div
          className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: '#F9FAFB' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#0EA5E9' }}
          >
            <span className="text-white text-sm font-bold">م</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{profileLabel()}</p>
            <p className="text-xs text-gray-500 truncate">مشاور تحصیلی</p>
          </div>
        </div>
      </div>
    </div>
  );
}
