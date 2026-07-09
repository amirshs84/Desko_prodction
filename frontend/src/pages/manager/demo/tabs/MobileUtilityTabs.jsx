import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import { useManagerDashboard } from '../context/ManagerDashboardContext';

function NotificationTypeIcon({ type }) {
  if (type === 'warning') return <AlertTriangle size={18} color="#F59E0B" />;
  if (type === 'success') return <CheckCircle2 size={18} color="#10B981" />;
  return <Info size={18} color="#6B7280" />;
}

const TYPE_BG = { warning: '#FEF3C7', success: '#D1FAE5', info: '#F3F4F6' };

function NotificationsBody() {
  const {
    notifications,
    notificationsLoading,
    markAllNotificationsRead,
    markNotificationRead,
  } = useManagerDashboard();

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">اعلان‌ها</h1>
          <p className="text-xs text-gray-500 mt-0.5">رویدادهای مهم مدرسه</p>
        </div>
        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="text-xs font-semibold text-emerald-600 px-3 py-1.5 rounded-xl"
          style={{ background: '#ECFDF5' }}
        >
          خوانده شد
        </button>
      </div>

      <div className="space-y-3">
        {notificationsLoading && notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">در حال بارگذاری...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">هیچ اعلانی وجود ندارد</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markNotificationRead(n.id)}
              className="w-full rounded-3xl p-4 text-right transition-all active:scale-[0.99]"
              style={{
                ...CARD_STYLE,
                border: n.unread ? '1px solid #A7F3D0' : CARD_STYLE.border,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: TYPE_BG[n.type] || '#F3F4F6' }}
                >
                  <NotificationTypeIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{n.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{n.time}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function NotificationsDesktop() {
  return (
    <DesktopPageShell>
      <div className="px-8 py-6">
        <NotificationsBody />
      </div>
    </DesktopPageShell>
  );
}

export function NotificationsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <NotificationsBody />
    </MobilePageShell>
  );
}
