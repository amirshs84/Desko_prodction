import { BOTTOM_NAV } from '../constants/navItems';

export default function MobileBottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      dir="ltr"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #E5E7EB',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        paddingTop: 8,
        minHeight: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {BOTTOM_NAV.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 px-1 min-w-0"
          >
            <Icon size={22} color={isActive ? '#059669' : '#9CA3AF'} />
            <span
              className="text-[10px] font-medium leading-none truncate max-w-full"
              style={{ color: isActive ? '#059669' : '#9CA3AF' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
