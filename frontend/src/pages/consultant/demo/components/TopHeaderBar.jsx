import SidebarToggleIcon from './SidebarToggleIcon';
import { CommandPaletteTrigger } from './CommandPalette';
import { useConsultant } from '../context/ConsultantContext';

export default function TopHeaderBar({ title = 'پنل مشاور' }) {
  const { desktopSidebarCollapsed, toggleDesktopSidebar } = useConsultant();

  return (
    <div
      className="flex items-center gap-3 px-6 py-4 sticky top-0 z-10"
      style={{
        background: 'rgba(248,250,252,0.97)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <button
        className="p-2 rounded-xl hover:bg-gray-100"
        onClick={toggleDesktopSidebar}
        aria-label={desktopSidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
      >
        <SidebarToggleIcon collapsed={desktopSidebarCollapsed} />
      </button>
      <h1 className="text-lg font-bold text-gray-900 flex-1">{title}</h1>
      <CommandPaletteTrigger />
    </div>
  );
}
