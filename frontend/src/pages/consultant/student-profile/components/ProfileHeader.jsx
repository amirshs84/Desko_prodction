import { ArrowRight, MessageCircle } from 'lucide-react';
import { GRADE_LABELS, PROFILE } from '../profileTheme';

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function ProfileHeader({ student, userId, onBack, activeTab, onTabChange, onMessage }) {
  const name = student?.full_name || `دانش‌آموز #${userId}`;
  const gradeLabel = student?.grade
    ? `پایه ${GRADE_LABELS[student.grade] || student.grade}`
    : null;
  const field = student?.olympiad_field || null;
  const classes = (student?.class_names || []).filter(Boolean);
  const groups = student?.groups || [];

  const tabs = [
    { id: 'calendar', label: 'تقویم و برنامه‌ریزی' },
    { id: 'analytics', label: 'گزارش‌های عملکرد' },
    { id: 'interactions', label: 'پیام‌ها و یادداشت‌ها' },
    { id: 'identity', label: 'اطلاعات هویتی' },
  ];

  return (
    <header
      className="shrink-0 border-b px-4 md:px-8 pt-4 pb-0"
      style={{ background: PROFILE.surface, borderColor: PROFILE.border }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm mb-3 transition-colors"
        style={{ color: PROFILE.brand }}
      >
        <ArrowRight size={16} />
        بازگشت به پنل مشاور
      </button>

      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 pb-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center
                       text-lg md:text-xl font-bold text-white shrink-0"
            style={{
              background: `linear-gradient(145deg, ${PROFILE.brand} 0%, ${PROFILE.brandStrong} 100%)`,
            }}
            aria-hidden
          >
            {initials(name)}
          </div>

          <div className="min-w-0">
            <h1
              className="text-xl md:text-2xl font-bold truncate"
              style={{ color: PROFILE.ink }}
            >
              {name}
            </h1>
            <p className="text-xs md:text-sm mt-1" style={{ color: PROFILE.inkMuted }}>
              {[gradeLabel, field, classes.join('، ') || null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {groups.slice(0, 4).map((g) => (
                <span
                  key={g.id}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: PROFILE.brandSoft, color: PROFILE.brandStrong }}
                >
                  {g.name}
                </span>
              ))}
              {groups.length === 0 && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: '#F1F5F9', color: PROFILE.inkMuted }}
                >
                  بدون گروه
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onMessage}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                     text-sm font-bold text-white shadow-sm shrink-0
                     hover:brightness-105 active:scale-[0.98] transition"
          style={{ background: PROFILE.brand }}
        >
          <MessageCircle size={18} strokeWidth={2.4} />
          ارسال پیام
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto -mx-1 px-1" aria-label="تب‌های پروفایل">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className="px-3.5 py-2.5 text-sm font-semibold shrink-0 border-b-2 transition-colors"
              style={{
                color: active ? PROFILE.brandStrong : PROFILE.inkMuted,
                borderColor: active ? PROFILE.brand : 'transparent',
                background: 'transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
