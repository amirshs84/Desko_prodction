import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import { NAV_ITEMS } from '../constants/navItems';
import { PANEL } from '../constants/theme';
import { performLogout } from '../../../../utils/auth';
import { useConsultant } from '../context/ConsultantContext';

export default function Sidebar({ activeItem, onNavigate, onClose }) {
  const { desktopSidebarCollapsed, toggleDesktopSidebar } = useConsultant();
  const rail = !onClose && desktopSidebarCollapsed;

  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    onClose?.();
    await performLogout();
  };

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: PANEL.sidebar }}
    >
      <div className={`flex items-center gap-2.5 ${rail ? 'px-2 py-3' : 'px-4 py-5'}`}>
        {!rail && (
          <p className="font-bold text-[15px] leading-tight tracking-tight">مشاور تحصیلی</p>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mr-auto p-1.5 rounded-lg hover:bg-white/10"
            aria-label="بستن منو"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto ${rail ? 'px-2' : 'px-3'} pb-4`} aria-label="ناوبری پنل مشاور">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              title={rail ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center rounded-xl mb-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                rail ? 'justify-center h-11' : 'gap-3 px-3.5 py-3'
              }`}
              style={{
                background: isActive ? PANEL.sidebarActive : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.78)',
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              {!rail && <span className="font-medium text-[13.5px]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {onClose && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-white/80 hover:bg-white/10"
          >
            <LogOut size={18} />
            <span className="font-medium text-[13.5px]">خروج از حساب</span>
          </button>
        </div>
      )}

      {!onClose && (
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className={`w-full flex items-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white ${
              rail ? 'justify-center h-11' : 'justify-between px-3.5 py-3'
            }`}
            aria-label={rail ? 'باز کردن منو' : 'جمع کردن منو'}
          >
            {!rail && <span className="text-[13px] font-medium">جمع کردن منو</span>}
            {rail ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}
