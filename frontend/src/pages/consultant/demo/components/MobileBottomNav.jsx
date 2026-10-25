import { BOTTOM_NAV } from '../constants/navItems';
import { PANEL } from '../constants/theme';

export default function MobileBottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: PANEL.sidebar,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingTop: 8,
        minHeight: 'calc(4.15rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="ناوبری پایین"
    >
      {BOTTOM_NAV.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 px-1 min-w-0 min-h-11"
            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.62)' }}
          >
            <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium leading-none truncate max-w-full">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
