import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock3,
  Flame,
  Inbox,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { useConsultant } from '../context/ConsultantContext';
import {
  useConsultantDashboard,
  useConsultantPreferences,
  useStudentMessageMutations,
} from '../hooks/useConsultantQueries';
import { openStudentProfile } from '../lib/navigation';
import { formatDuration } from './students/rosterUtils';
import { STUDIO } from './planning/studioTheme';

const CC = {
  ...STUDIO,
  dangerSoft: '#FEF2F2',
  yellowSoft: '#FFFBEB',
  greenSoft: '#ECFDF5',
};

function DashboardBody() {
  const navigate = useNavigate();
  const { navigateToTab, activeNav } = useConsultant();
  const { data, isLoading, isError, error, refetch } = useConsultantDashboard();
  const { data: prefs } = useConsultantPreferences();
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const { sendMessage } = useStudentMessageMutations(replyFor?.studentId);
  const quickReplies = (prefs?.quick_replies || []).filter((r) => r.body?.trim());

  const openProfile = (userId, profileTab) => {
    openStudentProfile(navigate, userId, {
      profileTab,
      fromTab: activeNav || 'dashboard',
    });
  };

  const submitReply = async () => {
    if (!replyFor?.studentId || !replyText.trim()) return;
    await sendMessage.mutateAsync({ body: replyText.trim() });
    setReplyText('');
    setReplyFor(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-5xl mx-auto text-sm" style={{ color: CC.muted }}>
        در حال آماده‌سازی پیشخوان…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-5xl mx-auto">
        <p className="text-sm text-red-600 mb-3">
          {error?.response?.data?.detail || 'بارگذاری پیشخوان ناموفق بود.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium px-3 py-2 rounded-xl"
          style={{ background: CC.brandSoft, color: CC.brandStrong }}
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  const g = data?.gamification || {};
  const sections = [
    {
      key: 'at_risk',
      title: 'اورژانسی',
      icon: AlertTriangle,
      accent: CC.danger,
      soft: CC.dangerSoft,
      items: data?.at_risk || [],
      empty: 'الان کسی در وضعیت اورژانسی نیست.',
      render: (item) => (
        <StudentRow
          key={item.user_id}
          name={item.full_name}
          meta={item.reason}
          right={`${item.progress_percent}%`}
          danger
          onOpen={() => openProfile(item.user_id)}
          onMessage={() => openProfile(item.user_id, 'interactions')}
        />
      ),
    },
    {
      key: 'top',
      title: 'قهرمانان هفته',
      icon: Star,
      accent: CC.brand,
      soft: CC.brandSoft,
      items: data?.top_performers || [],
      empty: 'هنوز داده‌ای برای رتبه‌بندی نیست.',
      render: (item) => (
        <StudentRow
          key={item.user_id}
          name={item.full_name}
          meta={formatDuration(item.study_seconds)}
          right={`${item.progress_percent}%`}
          onOpen={() => openProfile(item.user_id)}
        />
      ),
    },
    {
      key: 'rising',
      title: 'رشد چشمگیر',
      icon: TrendingUp,
      accent: '#0D9488',
      soft: '#F0FDFA',
      items: data?.rising_stars || [],
      empty: 'هنوز رشد مثبت نسبت به هفته قبل دیده نشده.',
      render: (item) => (
        <StudentRow
          key={item.user_id}
          name={item.full_name}
          meta={`+${formatDuration(item.delta_seconds)} نسبت به هفته قبل`}
          right={`${item.progress_percent}%`}
          onOpen={() => openProfile(item.user_id)}
        />
      ),
    },
    {
      key: 'pending',
      title: 'در انتظار بررسی',
      icon: Clock3,
      accent: CC.warn,
      soft: CC.warnSoft,
      items: data?.pending || [],
      empty: 'موردی در انتظار نیست.',
      render: (item) => (
        <button
          key={`${item.type}-${item.run_id}-${item.student_id}`}
          type="button"
          onClick={() => navigateToTab('analytics')}
          className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/70 transition-colors"
        >
          <p className="text-sm font-semibold" style={{ color: CC.ink }}>{item.student_name}</p>
          <p className="text-xs mt-0.5" style={{ color: CC.muted }}>{item.label}</p>
        </button>
      ),
    },
  ];

  return (
    <div
      className="px-4 md:px-8 py-5 md:py-6 max-w-5xl mx-auto flex flex-col gap-5"
      style={{ background: 'transparent' }}
    >
      <div>
        <h2 className="text-2xl font-bold" style={{ color: CC.ink }}>داشبورد</h2>
        <p className="text-sm mt-1" style={{ color: CC.muted }}>
          تریاژ روزانه، فید زنده و پاسخ سریع
        </p>
      </div>

      <GamificationBar
        avg={g.avg_completion_percent ?? 0}
        hours={g.total_study_hours ?? 0}
        spark={g.sparkline_hours || []}
        count={g.student_count ?? 0}
      />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 flex flex-col gap-3">
          {sections.map((sec) => (
            <ListCard
              key={sec.key}
              title={sec.title}
              count={sec.items.length}
              icon={sec.icon}
              accent={sec.accent}
              soft={sec.soft}
            >
              {sec.items.length === 0 ? (
                <p className="text-sm px-3 py-2" style={{ color: CC.muted }}>{sec.empty}</p>
              ) : (
                <div className="flex flex-col gap-1 px-1 pb-1">
                  {sec.items.map(sec.render)}
                </div>
              )}
            </ListCard>
          ))}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel title="فعالیت زنده" icon={Flame}>
            {(data?.live_feed || []).length === 0 ? (
              <p className="text-sm" style={{ color: CC.muted }}>هنوز فعالیت تازه‌ای نیست.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(data.live_feed || []).map((item) => (
                  <SwipeReplyCard
                    key={item.id}
                    onSwipeReply={() => {
                      setReplyFor({
                        studentId: item.student_id,
                        name: item.student_name || 'دانش‌آموز',
                      });
                      setReplyText('');
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openProfile(item.student_id)}
                      className="w-full text-right"
                    >
                      <p className="text-sm leading-6" style={{ color: CC.ink }}>{item.text}</p>
                    </button>
                  </SwipeReplyCard>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="اینباکس" icon={Inbox}>
            {(data?.inbox || []).length === 0 ? (
              <p className="text-sm" style={{ color: CC.muted }}>پیامی نیست.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(data.inbox || []).map((msg) => (
                  <SwipeReplyCard
                    key={msg.id}
                    onSwipeReply={() => {
                      setReplyFor({ studentId: msg.student_id, name: msg.student_name });
                      setReplyText('');
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openProfile(msg.student_id, 'interactions')}
                      className="w-full text-right flex gap-2.5 items-start"
                    >
                      <span
                        className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: urgencyColor(msg.urgency) }}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: CC.ink }}>
                            {msg.student_name}
                          </span>
                          <span className="text-[10px] shrink-0" style={{ color: CC.muted }}>
                            {urgencyLabel(msg.urgency)}
                          </span>
                        </span>
                        <span className="block text-xs mt-0.5 line-clamp-2" style={{ color: CC.muted }}>
                          {msg.body}
                        </span>
                      </span>
                    </button>
                  </SwipeReplyCard>
                ))}
              </ul>
            )}
            <p className="text-[11px] mt-3" style={{ color: CC.muted }}>
              برای پاسخ سریع کارت را به چپ بکشید
            </p>
          </Panel>
        </div>
      </div>

      {replyFor && (
        <QuickReplyBar
          name={replyFor.name}
          value={replyText}
          onChange={setReplyText}
          onClose={() => setReplyFor(null)}
          onSend={submitReply}
          sending={sendMessage.isPending}
          templates={quickReplies}
        />
      )}
    </div>
  );
}

function GamificationBar({ avg, hours, spark, count }) {
  return (
    <div
      className="rounded-2xl px-4 py-4 md:px-5 md:py-4 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${CC.brandSoft} 0%, #fff 55%, ${CC.pageBg} 100%)`,
        border: `1px solid ${CC.border}`,
      }}
    >
      <div className="flex items-center gap-3 min-w-[140px]">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg"
          style={{ background: CC.brand, color: '#fff' }}
        >
          {avg}%
        </div>
        <div>
          <p className="text-xs" style={{ color: CC.muted }}>میانگین موفقیت</p>
          <p className="text-sm font-semibold" style={{ color: CC.ink }}>
            تکمیل برنامه · {count} نفر
          </p>
        </div>
      </div>

      <div className="hidden sm:block w-px self-stretch" style={{ background: CC.border }} />

      <div className="flex items-center gap-2 min-w-[120px]">
        <Sparkles size={16} color={CC.brand} />
        <div>
          <p className="text-xs" style={{ color: CC.muted }}>ساعات مطالعه هفته</p>
          <p className="text-sm font-bold" style={{ color: CC.ink }}>{hours} ساعت</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        <span className="text-xs hidden md:inline" style={{ color: CC.muted }}>روند هفته</span>
        <Sparkline values={spark} />
      </div>
    </div>
  );
}

function Sparkline({ values }) {
  const pts = values?.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...pts, 0.1);
  const w = 120;
  const h = 36;
  const step = w / Math.max(pts.length - 1, 1);
  const d = pts
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke={CC.brand} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ListCard({ title, count, icon: Icon, accent, soft, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${CC.border}`, background: '#fff' }}
    >
      <div
        className="flex items-center gap-3 px-3.5 py-3 text-right"
        style={{ background: soft }}
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#fff', color: accent }}
        >
          <Icon size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold" style={{ color: CC.ink }}>{title}</span>
          <span className="block text-xs" style={{ color: CC.muted }}>{count} مورد</span>
        </span>
      </div>
      <div className="px-2 pb-2 pt-1">{children}</div>
    </div>
  );
}

function StudentRow({ name, meta, right, danger, onOpen, onMessage }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{ background: danger ? CC.dangerSoft : 'transparent' }}
    >
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-right">
        <p className="text-sm font-semibold truncate" style={{ color: danger ? CC.danger : CC.ink }}>
          {name}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: CC.muted }}>{meta}</p>
      </button>
      {right != null && (
        <span
          className="text-xs font-bold tabular-nums shrink-0"
          style={{ color: danger ? CC.danger : CC.brandStrong }}
        >
          {right}
        </span>
      )}
      {onMessage && (
        <button
          type="button"
          onClick={onMessage}
          className="p-1.5 rounded-lg shrink-0"
          style={{ background: '#fff', color: CC.muted }}
          aria-label="ارسال پیام"
        >
          <MessageSquare size={14} />
        </button>
      )}
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#fff', border: `1px solid ${CC.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} color={CC.brand} />
        <h3 className="text-sm font-bold" style={{ color: CC.ink }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SwipeReplyCard({ children, onSwipeReply }) {
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);

  const onStart = (x) => {
    startX.current = x;
  };
  const onMove = (x) => {
    if (startX.current == null) return;
    const dx = x - startX.current;
    // کشیدن به چپ (در RTL حس reply)
    if (dx < 0) setOffset(Math.max(dx, -72));
  };
  const onEnd = () => {
    if (offset < -48) onSwipeReply?.();
    setOffset(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 left-0 w-16 flex items-center justify-center text-xs font-medium"
        style={{ background: CC.brandSoft, color: CC.brandStrong }}
      >
        پاسخ
      </div>
      <div
        className="relative rounded-xl px-2.5 py-2 transition-transform"
        style={{
          background: CC.pageBg,
          transform: `translateX(${offset}px)`,
          touchAction: 'pan-y',
        }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => {
          if (e.buttons === 1) onMove(e.clientX);
        }}
        onMouseUp={onEnd}
        onMouseLeave={() => {
          if (startX.current != null) onEnd();
        }}
      >
        {children}
      </div>
    </div>
  );
}

function QuickReplyBar({ name, value, onChange, onClose, onSend, sending, templates = [] }) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 px-3 pb-4 pt-3 md:px-8"
      style={{
        background: 'linear-gradient(180deg, transparent, #fff 28%)',
      }}
    >
      <div
        className="max-w-5xl mx-auto rounded-2xl p-3 shadow-lg flex flex-col gap-2"
        style={{ background: '#fff', border: `1px solid ${CC.border}` }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: CC.muted }}>
            پاسخ سریع به {name}
          </p>
          <button type="button" onClick={onClose} className="text-xs" style={{ color: CC.muted }}>
            بستن
          </button>
        </div>
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id || t.title}
                type="button"
                onClick={() => onChange(t.body)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                style={{ background: CC.brandSoft, color: CC.brandStrong }}
              >
                {t.title || 'پاسخ'}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="متن پیام را بنویسید…"
            className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: CC.pageBg, color: CC.ink, border: `1px solid ${CC.border}` }}
          />
          <button
            type="button"
            disabled={sending || !value.trim()}
            onClick={onSend}
            className="px-3.5 rounded-xl flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: CC.brand, color: '#fff' }}
          >
            <Send size={14} />
            ارسال پیام
          </button>
        </div>
      </div>
    </div>
  );
}

function urgencyColor(u) {
  if (u === 'red') return '#DC2626';
  if (u === 'yellow') return '#D97706';
  return '#059669';
}

function urgencyLabel(u) {
  if (u === 'red') return 'اورژانسی';
  if (u === 'yellow') return 'نیازمند پاسخ';
  return 'روتین';
}

export function DashboardDesktop() {
  return (
    <DesktopPageShell title="داشبورد">
      <DashboardBody />
    </DesktopPageShell>
  );
}

export function DashboardMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <DashboardBody />
    </MobilePageShell>
  );
}
