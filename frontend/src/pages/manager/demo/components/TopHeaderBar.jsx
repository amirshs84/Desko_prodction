import { useEffect, useRef } from 'react';
import {
  Bell, Mail, Calendar, ChevronDown, Check, Settings,
  AlertTriangle, CheckCircle2, Info, Clock, ArrowLeft,
} from 'lucide-react';
import { useManagerDashboard } from '../context/ManagerDashboardContext';
import SidebarToggleIcon from './SidebarToggleIcon';
import { CARD_STYLE } from '../constants/theme';
import { UPCOMING_EVENTS } from '../data/headerMockData';

const PANEL_STYLE = {
  ...CARD_STYLE,
  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
  border: '1px solid #E5E7EB',
};

function useClickOutside(ref, onClose, enabled) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose, enabled]);
}

function NotificationTypeIcon({ type }) {
  if (type === 'warning') return <AlertTriangle size={16} color="#F59E0B" />;
  if (type === 'success') return <CheckCircle2 size={16} color="#10B981" />;
  return <Info size={16} color="#6B7280" />;
}

function PanelHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h3 className="font-bold text-sm text-gray-900">{title}</h3>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default function TopHeaderBar() {
  const {
    desktopSidebarCollapsed,
    toggleDesktopSidebar,
    academicYear,
    activePanel,
    togglePanel,
    closePanel,
    selectAcademicYear,
    academicYears,
    goToSettings,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    unreadNotificationCount,
    messages,
    markAllMessagesRead,
    markMessageRead,
    unreadMessageCount,
  } = useManagerDashboard();

  const headerRef = useRef(null);
  useClickOutside(headerRef, closePanel, !!activePanel);

  const notifTypeBg = {
    warning: '#FEF3C7',
    success: '#D1FAE5',
    info: '#F3F4F6',
  };

  return (
    <div
      ref={headerRef}
      className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b"
      style={{ background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(10px)', borderColor: '#E5E7EB' }}
    >
      {/* سمت راست (RTL): toggle + سال تحصیلی */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDesktopSidebar}
          className="p-2.5 rounded-2xl hover:bg-white transition-all"
          title={desktopSidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
          aria-label={desktopSidebarCollapsed ? 'باز کردن سایدبار' : 'بستن سایدبار'}
        >
          <SidebarToggleIcon collapsed={desktopSidebarCollapsed} />
        </button>

        <div className="relative">
          <button
            onClick={() => togglePanel('academicYear')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: activePanel === 'academicYear' ? '#ECFDF5' : '#fff',
              border: `1px solid ${activePanel === 'academicYear' ? '#10B981' : '#E5E7EB'}`,
              color: '#374151',
            }}
          >
            <Calendar size={16} color="#10B981" />
            <span>سال تحصیلی {academicYear.label}</span>
            <ChevronDown
              size={14}
              color="#9CA3AF"
              className="transition-transform"
              style={{ transform: activePanel === 'academicYear' ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {activePanel === 'academicYear' && (
            <div
              className="absolute top-full mt-2 right-0 w-64 rounded-2xl overflow-hidden z-50"
              style={PANEL_STYLE}
            >
              <PanelHeader title="انتخاب سال تحصیلی" />
              <div className="py-1">
                {academicYears.map((year) => {
                  const isActive = academicYear.id === year.id;
                  return (
                    <button
                      key={year.id}
                      onClick={() => selectAcademicYear(year)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 transition-colors"
                    >
                      <Calendar size={16} color={isActive ? '#10B981' : '#9CA3AF'} />
                      <span className={`flex-1 text-sm ${isActive ? 'font-bold text-emerald-700' : 'text-gray-700'}`}>
                        سال تحصیلی {year.label}
                      </span>
                      {isActive && <Check size={16} color="#10B981" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={goToSettings}
                className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-xs font-semibold text-gray-500 hover:bg-gray-50"
              >
                <Settings size={14} />
                <span>مدیریت در تنظیمات</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* سمت چپ (RTL): اعلان‌ها، پیام‌ها، تقویم */}
      <div className="flex items-center gap-1">
        {/* اعلان‌ها */}
        <div className="relative">
          <button
            onClick={() => togglePanel('notifications')}
            className="relative p-2.5 rounded-2xl transition-all"
            style={{ background: activePanel === 'notifications' ? '#fff' : 'transparent' }}
          >
            <Bell size={20} color={activePanel === 'notifications' ? '#10B981' : '#6B7280'} />
            {unreadNotificationCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[8px] h-2 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#EF4444' }}
              >
                {unreadNotificationCount > 9 ? '۹+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {activePanel === 'notifications' && (
            <div
              className="absolute top-full mt-2 left-0 w-80 rounded-2xl overflow-hidden z-50"
              style={PANEL_STYLE}
            >
              <PanelHeader
                title="اعلان‌ها"
                action="خوانده شد"
                onAction={markAllNotificationsRead}
              />
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: notifTypeBg[n.type] || '#F3F4F6' }}
                    >
                      <NotificationTypeIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${n.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {n.title}
                        </p>
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.desc}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* پیام‌ها */}
        <div className="relative">
          <button
            onClick={() => togglePanel('messages')}
            className="relative p-2.5 rounded-2xl transition-all"
            style={{ background: activePanel === 'messages' ? '#fff' : 'transparent' }}
          >
            <Mail size={20} color={activePanel === 'messages' ? '#10B981' : '#6B7280'} />
            {unreadMessageCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[8px] h-2 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#EF4444' }}
              />
            )}
          </button>

          {activePanel === 'messages' && (
            <div
              className="absolute top-full mt-2 left-0 w-80 rounded-2xl overflow-hidden z-50"
              style={PANEL_STYLE}
            >
              <PanelHeader
                title="پیام‌ها"
                action="خوانده شد"
                onAction={markAllMessagesRead}
              />
              <div className="max-h-72 overflow-y-auto">
                {messages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => markMessageRead(m.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                      style={{ background: m.unread ? '#10B981' : '#9CA3AF' }}
                    >
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${m.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {m.from}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{m.time}</span>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-medium">{m.role}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{m.preview}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button className="w-full flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100 text-xs font-semibold text-emerald-600 hover:bg-gray-50">
                <span>مشاهده همه پیام‌ها</span>
                <ArrowLeft size={14} />
              </button>
            </div>
          )}
        </div>

        {/* تقویم / رویدادها */}
        <div className="relative">
          <button
            onClick={() => togglePanel('calendar')}
            className="relative p-2.5 rounded-2xl transition-all"
            style={{ background: activePanel === 'calendar' ? '#fff' : 'transparent' }}
          >
            <Calendar size={20} color={activePanel === 'calendar' ? '#10B981' : '#6B7280'} />
          </button>

          {activePanel === 'calendar' && (
            <div
              className="absolute top-full mt-2 left-0 w-72 rounded-2xl overflow-hidden z-50"
              style={PANEL_STYLE}
            >
              <PanelHeader title="رویدادهای پیش‌رو" />
              <div className="py-2">
                {UPCOMING_EVENTS.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ background: ev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{ev.date}</span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} />
                          {ev.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100 text-xs font-semibold text-emerald-600 hover:bg-gray-50">
                <span>مشاهده تقویم کامل</span>
                <ArrowLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
