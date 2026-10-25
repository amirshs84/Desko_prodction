import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, LogOut, Mail, Search } from 'lucide-react';
import { useConsultant } from '../context/ConsultantContext';
import { PANEL } from '../constants/theme';
import { consultantIdentity, formatConsultantNow } from '../lib/format';
import { InitialAvatar } from './PanelArt';
import { performLogout } from '../../../../utils/auth';

const OPEN_EVENT = 'consultant:open-command-palette';

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function TopHeaderBar({ title }) {
  const { activeNav, setActiveNav, onLeave } = useConsultant();
  const [now, setNow] = useState(() => formatConsultantNow());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const identity = consultantIdentity();

  useEffect(() => {
    const id = window.setInterval(() => setNow(formatConsultantNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [menuOpen]);

  const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

  const openTab = (id) => (onLeave ? onLeave(id) : setActiveNav(id));

  const go = (sectionId) => {
    if (onLeave) {
      onLeave('dashboard');
      return;
    }
    if (activeNav !== 'dashboard') {
      setActiveNav('dashboard');
      window.setTimeout(() => scrollToSection(sectionId), 80);
      return;
    }
    scrollToSection(sectionId);
  };

  const logout = async () => {
    setMenuOpen(false);
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 px-4 xl:px-6 py-3.5"
      style={{ background: 'rgba(243,246,244,0.94)', backdropFilter: 'blur(14px)' }}
    >
      <div className="shrink-0 min-w-[8.5rem] text-right">
        {title ? (
          <p className="text-[15px] font-extrabold leading-tight" style={{ color: PANEL.ink }}>{title}</p>
        ) : null}
        <p
          className={title ? 'text-[11px] mt-0.5' : 'text-[13px] font-bold'}
          style={{ color: title ? PANEL.muted : PANEL.ink }}
        >
          {now.full}
        </p>
        <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: PANEL.muted }}>{now.time}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton label="تقویم و برنامه‌ریزی" onClick={() => openTab('planning')}>
          <CalendarDays size={18} />
        </IconButton>
        <IconButton label="پیام‌های نخوانده" onClick={() => go('inbox-queue')}>
          <Mail size={18} />
        </IconButton>
        <IconButton label="اعلان‌ها" onClick={() => go('overdue-followups')}>
          <Bell size={18} />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#F3F6F4]" />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={openSearch}
        className="flex-1 min-w-0 flex items-center gap-2 h-11 px-4 rounded-2xl bg-white text-right shadow-[0_6px_18px_rgba(18,70,45,0.05)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1B8A5C]"
        style={{ color: PANEL.muted }}
      >
        <Search size={16} color={PANEL.green} />
        <span className="truncate text-[13px]">جستجوی دانش‌آموز، جلسه، درس و ...</span>
      </button>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-2xl py-1 pr-1 pl-1 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1B8A5C]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="text-right hidden md:block">
            <span className="block text-[13px] font-bold leading-tight" style={{ color: PANEL.ink }}>
              {identity.full}
            </span>
            <span className="block text-[11px] mt-0.5" style={{ color: PANEL.muted }}>
              {identity.role}
            </span>
          </span>
          <InitialAvatar name={identity.full} size={40} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+8px)] w-44 rounded-2xl bg-white p-1.5 shadow-xl z-30"
            style={{ border: `1px solid ${PANEL.line}` }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} />
              خروج از حساب
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#3E5C50] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1B8A5C]"
    >
      {children}
    </button>
  );
}
