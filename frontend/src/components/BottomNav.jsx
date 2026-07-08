import { useNavigate, useLocation } from 'react-router-dom';

/* ── بررسی کش آپدیت برای نشان دادن badge ── */
function hasPendingUpdate() {
  return !!localStorage.getItem('desko_pending_update_version');
}

/* ── آیکون‌های ناوبار ── */
const icons = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
      <rect x="5" y="19" width="14" height="2" rx="1" />
      <path d="M 10 19 V 17 a 2 2 0 0 1 4 0 v 2" />
      <line x1="11" y1="16" x2="8" y2="11.5" />
      <circle cx="7.5" cy="10.5" r="1.5" />
      <line x1="8.5" y1="9.5" x2="12.5" y2="5.5" />
      <path d="M 11.5 4.5 l 2 2" />
      <path d="M 12 4 l 5.5 1.5 c 1 2.5 -0.5 5.5 -2.5 6.5 l -5 -2 c -1.5 -2 -0.5 -5 2 -6 z" />
    </svg>
  ),
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
      <line x1="2" y1="21" x2="22" y2="21" />
      <path d="M 4.5 21 V 19 A 1.5 1.5 0 0 1 7.5 19 V 21" />
      <path d="M 10.5 21 V 15.5 A 1.5 1.5 0 0 1 13.5 15.5 V 21" />
      <path d="M 16.5 21 V 8.5 A 1.5 1.5 0 0 1 19.5 8.5 V 21" />
      <path d="M 2 16 C 11 16, 16 7, 21 2" />
      <polyline points="17.5,2 21,2 21,5.5" />
    </svg>
  ),
  calendar: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
      <circle cx="12" cy="7" r="4" />
      <path d="M 5 21 V 18 A 5 5 0 0 1 10 13 H 14 A 5 5 0 0 1 19 18 V 21" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'home',      path: '/timer',     label: 'میز کار',  icon: icons.home },
  { id: 'dashboard', path: '/dashboard', label: 'پیشرفت',   icon: icons.dashboard },
  { id: 'calendar',  path: '/calendar',  label: 'تقویم',    icon: icons.calendar },
  { id: 'profile',   path: '/courses',   label: 'پروفایل',  icon: icons.profile, badge: true },
];

const BottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isActive  = (path) =>
    path === '/calendar'
      ? location.pathname.startsWith('/calendar')
      : location.pathname === path;
  const updateBadge = hasPendingUpdate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav backdrop-blur-xl
                    border-t border-edge z-40 safe-area-pb">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center h-20 pt-1 pb-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const showBadge = item.badge && updateBadge && !active;

            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center gap-1.5 px-5 py-2
                            rounded-xl transition-all duration-200 ${
                  active ? 'text-brand' : 'text-ink-3 hover:text-ink-2'
                }`}>
                <div className={`relative transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full
                                     border-2 border-nav animate-pulse" />
                  )}
                </div>
                <span className={`text-[12px] font-medium transition-all duration-200 ${
                  active ? 'opacity-100' : 'opacity-70'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 w-10 h-1 bg-brand-2 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
