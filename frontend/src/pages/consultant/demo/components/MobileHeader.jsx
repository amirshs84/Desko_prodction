import { GraduationCap } from 'lucide-react';
import SidebarToggleIcon from './SidebarToggleIcon';

export default function MobileHeader({ onMenuClick, sidebarOpen = false }) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
      style={{
        background: 'rgba(248,250,252,0.97)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <button
        className="p-2 rounded-xl hover:bg-gray-100"
        onClick={onMenuClick}
        aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
      >
        <SidebarToggleIcon collapsed={!sidebarOpen} />
      </button>
      <div className="text-center">
        <p className="font-bold text-gray-900 text-base leading-tight">دسکو</p>
        <p className="text-xs text-sky-600 font-medium">پنل مشاور</p>
      </div>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: '#0EA5E9' }}
      >
        <GraduationCap size={20} color="#fff" />
      </div>
    </div>
  );
}
