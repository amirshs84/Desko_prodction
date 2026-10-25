import { Menu } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { ReportsBody } from './ReportsBody';

export default function ReportsMobile({ onMenuClick }) {
  return (
    <div className="max-w-3xl mx-auto w-full min-w-0">
      <header className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-extrabold" style={{ color: PANEL.ink }}>گزارش‌ها</h1>
        <button
          type="button"
          aria-label="باز کردن منو"
          onClick={onMenuClick}
          className="relative w-10 h-10 rounded-xl inline-flex items-center justify-center"
          style={{ color: PANEL.ink }}
        >
          <Menu size={22} />
        </button>
      </header>
      <ReportsBody />
    </div>
  );
}
