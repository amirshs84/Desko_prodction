import { BOTTOM_NAV } from '../constants/navItems';

export default function MobileBottomNav({ activeTab, onTabChange }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around px-2 pt-2"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #E5E7EB',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        minHeight: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {BOTTOM_NAV.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isCenter = tab.id === 'dashboard';

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-2 transition-all"
            style={{ paddingBottom: isCenter ? 4 : 8, minWidth: 56 }}
          >
            {isCenter ? (
              <div
                className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg -mt-5"
                style={{ background: isActive ? '#0EA5E9' : '#E5E7EB' }}
              >
                <Icon size={24} color={isActive ? '#fff' : '#9CA3AF'} />
              </div>
            ) : (
              <div className="relative h-7 flex items-center justify-center">
                <Icon size={22} color={isActive ? '#0EA5E9' : '#9CA3AF'} />
              </div>
            )}
            <span
              className="text-[11px] font-medium leading-none"
              style={{ color: isActive ? '#0EA5E9' : '#9CA3AF' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
