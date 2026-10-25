import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock3,
  Columns3,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Plus,
  Save,
  Tags,
  Trash2,
  UserRound,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import ProfileDesktop from './profile/ProfileDesktop';
import ProfileMobile from './profile/ProfileMobile';
import { performLogout } from '../../../../utils/auth';
import { ticketAPI } from '../../../../api/client';
import {
  useConsultantPreferences,
  usePreferencesMutation,
  useSubjectCatalog,
  useSubjectCatalogMutations,
} from '../hooks/useConsultantQueries';
import { STUDIO } from './planning/studioTheme';

const CC = STUDIO;

const DAY_LABELS = [
  ['sat', 'شنبه'],
  ['sun', 'یکشنبه'],
  ['mon', 'دوشنبه'],
  ['tue', 'سه‌شنبه'],
  ['wed', 'چهارشنبه'],
  ['thu', 'پنجشنبه'],
  ['fri', 'جمعه'],
];

const NOTIF_LABELS = {
  direct_messages: 'پیام‌های دانش‌آموزان',
  plan_responses: 'پاسخ به پیشنهاد برنامه',
  dashboard_alerts: 'هشدارهای پیشخوان',
};

function SettingsBody() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useConsultantPreferences();
  const { updatePrefs } = usePreferencesMutation();

  const [quickReplies, setQuickReplies] = useState([]);
  const [columns, setColumns] = useState([]);
  const [notifications, setNotifications] = useState({});
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '18:00',
    days: ['sat', 'sun', 'mon', 'tue', 'wed'],
  });
  const [supportMsg, setSupportMsg] = useState('');
  const [supportState, setSupportState] = useState({ status: 'idle', text: '' });
  const [saveState, setSaveState] = useState({ status: 'idle', text: '' });

  useEffect(() => {
    if (!data) return;
    setQuickReplies(data.quick_replies || []);
    setColumns(data.visible_roster_columns || []);
    setNotifications(data.notifications || {});
    setWorkingHours({
      start: data.working_hours?.start || '09:00',
      end: data.working_hours?.end || '18:00',
      days: data.working_hours?.days || ['sat', 'sun', 'mon', 'tue', 'wed'],
    });
  }, [data]);

  const availableColumns = data?.available_roster_columns || [];
  const identity = data?.identity || {};

  const dirtyPayload = useMemo(
    () => ({
      quick_replies: quickReplies.filter((r) => (r.body || '').trim()),
      visible_roster_columns: columns,
      notifications,
      working_hours: {
        timezone: 'Asia/Tehran',
        start: workingHours.start,
        end: workingHours.end,
        days: workingHours.days,
      },
    }),
    [quickReplies, columns, notifications, workingHours],
  );

  const onSave = async () => {
    setSaveState({ status: 'saving', text: 'در حال ذخیره…' });
    try {
      await updatePrefs.mutateAsync(dirtyPayload);
      setSaveState({ status: 'ok', text: 'تغییرات ذخیره شد.' });
    } catch (err) {
      setSaveState({
        status: 'err',
        text:
          err?.response?.data?.error?.message
          || err?.response?.data?.detail
          || 'ذخیره تغییرات ناموفق بود.',
      });
    }
  };

  const onLogout = async () => {
    if (!window.confirm('آیا می‌خواهید خارج شوید؟')) return;
    await performLogout();
    navigate('/login');
  };

  const sendSupport = async () => {
    if (!supportMsg.trim()) return;
    setSupportState({ status: 'sending', text: 'در حال ارسال…' });
    try {
      await ticketAPI.sendTicket({
        ticket_type: 'support',
        message: supportMsg.trim(),
      });
      setSupportMsg('');
      setSupportState({ status: 'ok', text: 'پیام پشتیبانی ارسال شد.' });
    } catch (err) {
      setSupportState({
        status: 'err',
        text: err?.response?.data?.detail || 'ارسال پیام ناموفق بود.',
      });
    }
  };

  const toggleColumn = (key) => {
    setColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleDay = (day) => {
    setWorkingHours((prev) => {
      const has = prev.days.includes(day);
      if (has && prev.days.length <= 1) return prev;
      return {
        ...prev,
        days: has ? prev.days.filter((d) => d !== day) : [...prev.days, day],
      };
    });
  };

  const addReply = () => {
    if (quickReplies.length >= 12) return;
    setQuickReplies((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, title: 'پاسخ جدید', body: '' },
    ]);
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-3xl mx-auto text-sm animate-pulse" style={{ color: CC.muted }}>
        در حال بارگذاری تنظیمات…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-3xl mx-auto">
        <p className="text-sm text-red-600 mb-3">
          {error?.response?.data?.detail || 'بارگذاری تنظیمات ناموفق بود.'}
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

  return (
    <div className="px-4 md:px-8 py-5 md:py-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: CC.ink }}>حساب و تنظیمات</h2>
          <p className="text-sm mt-1" style={{ color: CC.muted }}>
            شخصی‌سازی محیط، پاسخ سریع و ارتباط با پشتیبانی
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={updatePrefs.isPending}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-50"
          style={{ background: CC.brand, color: '#fff' }}
        >
          <Save size={15} />
          ذخیره تغییرات
        </button>
      </div>

      {saveState.text && (
        <p
          className="text-xs"
          style={{ color: saveState.status === 'err' ? CC.danger : CC.brandStrong }}
        >
          {saveState.text}
        </p>
      )}

      <Section icon={UserRound} title="اطلاعات هویتی">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Field label="نام" value={identity.full_name || '—'} />
          <Field label="شماره تماس" value={identity.phone_number || '—'} />
          <Field label="مدرسه" value={identity.school_name || '—'} />
          <Field label="نقش" value="مشاور" />
        </div>
      </Section>

      <Section icon={MessageSquareText} title="پاسخ‌های سریع" hint="برای استفاده در پیشخوان هنگام کشیدن کارت پیام">
        <div className="flex flex-col gap-3">
          {quickReplies.map((reply, index) => (
            <div
              key={reply.id || index}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: CC.pageBg, border: `1px solid ${CC.border}` }}
            >
              <div className="flex gap-2">
                <input
                  value={reply.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setQuickReplies((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, title } : r)),
                    );
                  }}
                  placeholder="عنوان"
                  className="flex-1 text-sm rounded-lg px-2.5 py-2 outline-none bg-white"
                  style={{ border: `1px solid ${CC.border}`, color: CC.ink }}
                />
                <button
                  type="button"
                  onClick={() => setQuickReplies((prev) => prev.filter((_, i) => i !== index))}
                  className="p-2 rounded-lg"
                  style={{ color: CC.danger }}
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <textarea
                value={reply.body}
                onChange={(e) => {
                  const body = e.target.value;
                  setQuickReplies((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, body } : r)),
                  );
                }}
                rows={2}
                placeholder="متن پیام آماده…"
                className="text-sm rounded-lg px-2.5 py-2 outline-none bg-white resize-none"
                style={{ border: `1px solid ${CC.border}`, color: CC.ink }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addReply}
            disabled={quickReplies.length >= 12}
            className="self-start inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl disabled:opacity-40"
            style={{ background: CC.brandSoft, color: CC.brandStrong }}
          >
            <Plus size={14} />
            افزودن پاسخ
          </button>
        </div>
      </Section>

      <Section icon={Columns3} title="ستون‌های جدول دانش‌آموزان" hint="نام همیشه نمایش داده می‌شود">
        <div className="flex flex-wrap gap-2">
          {availableColumns.map((col) => {
            const on = columns.includes(col.key);
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => toggleColumn(col.key)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: on ? CC.brand : CC.pageBg,
                  color: on ? '#fff' : CC.muted,
                  border: `1px solid ${on ? CC.brand : CC.border}`,
                }}
              >
                {col.label}
                {col.placeholder ? ' *' : ''}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] mt-2" style={{ color: CC.muted }}>* ستون‌های جای‌نگهدار تا اتصال داده واقعی خالی می‌مانند</p>
      </Section>

      <Section icon={Bell} title="نوتیفیکیشن‌ها">
        <div className="flex flex-col gap-2">
          {Object.keys(NOTIF_LABELS).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
              style={{ background: CC.pageBg }}
            >
              <span className="text-sm" style={{ color: CC.ink }}>{NOTIF_LABELS[key]}</span>
              <input
                type="checkbox"
                checked={!!notifications[key]}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, [key]: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Clock3} title="ساعات کاری">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs" style={{ color: CC.muted }}>
            شروع
            <input
              type="time"
              value={workingHours.start}
              onChange={(e) => setWorkingHours((p) => ({ ...p, start: e.target.value }))}
              className="mt-1 w-full text-sm rounded-lg px-2.5 py-2 outline-none bg-white"
              style={{ border: `1px solid ${CC.border}`, color: CC.ink }}
            />
          </label>
          <label className="text-xs" style={{ color: CC.muted }}>
            پایان
            <input
              type="time"
              value={workingHours.end}
              onChange={(e) => setWorkingHours((p) => ({ ...p, end: e.target.value }))}
              className="mt-1 w-full text-sm rounded-lg px-2.5 py-2 outline-none bg-white"
              style={{ border: `1px solid ${CC.border}`, color: CC.ink }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map(([id, label]) => {
            const on = workingHours.days.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleDay(id)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  background: on ? CC.brandSoft : '#fff',
                  color: on ? CC.brandStrong : CC.muted,
                  border: `1px solid ${on ? CC.brandMid : CC.border}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <SubjectCatalogSection />

      <Section icon={LifeBuoy} title="ارتباط با پشتیبانی" hint={data?.support?.note}>
        <textarea
          value={supportMsg}
          onChange={(e) => setSupportMsg(e.target.value)}
          rows={3}
          placeholder="مشکل یا درخواست خود را بنویسید…"
          className="w-full text-sm rounded-xl px-3 py-2.5 outline-none resize-none mb-2"
          style={{ border: `1px solid ${CC.border}`, color: CC.ink, background: CC.pageBg }}
        />
        <button
          type="button"
          onClick={sendSupport}
          disabled={!supportMsg.trim() || supportState.status === 'sending'}
          className="text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-50"
          style={{ background: CC.brandSoft, color: CC.brandStrong }}
        >
          ارسال پیام
        </button>
        {supportState.text && (
          <p
            className="text-xs mt-2"
            style={{ color: supportState.status === 'err' ? CC.danger : CC.brandStrong }}
          >
            {supportState.text}
          </p>
        )}
      </Section>

      <div className="flex flex-wrap gap-2 pb-4">
        <button
          type="button"
          onClick={() => navigate('/consultant')}
          className="text-sm font-medium px-3.5 py-2 rounded-xl"
          style={{ background: CC.pageBg, color: CC.muted, border: `1px solid ${CC.border}` }}
        >
          بازگشت به پیشخوان
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl"
          style={{ background: '#FEF2F2', color: CC.danger }}
        >
          <LogOut size={15} />
          خروج
        </button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section
      className="rounded-2xl p-4"
      style={{ background: '#fff', border: `1px solid ${CC.border}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} color={CC.brand} />
        <h3 className="text-sm font-bold" style={{ color: CC.ink }}>{title}</h3>
      </div>
      {hint && <p className="text-xs mb-3" style={{ color: CC.muted }}>{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: CC.pageBg }}>
      <p className="text-[11px]" style={{ color: CC.muted }}>{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: CC.ink }}>{value}</p>
    </div>
  );
}

const TAG_OPTIONS = [
  { value: 'general', label: 'عمومی' },
  { value: 'specialized', label: 'اختصاصی' },
  { value: 'analytical', label: 'تحلیلی' },
  { value: 'memorization', label: 'حفظی' },
];

function SubjectCatalogSection() {
  const { data, isLoading } = useSubjectCatalog();
  const { upsert, remove } = useSubjectCatalogMutations();
  const [name, setName] = useState('');
  const [tags, setTags] = useState(['specialized', 'analytical']);
  const [priority, setPriority] = useState(3);
  const [error, setError] = useState('');

  const toggleTag = (value) => {
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await upsert.mutateAsync({
        name: name.trim(),
        tags,
        default_priority: Number(priority),
      });
      setName('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'ذخیره نشد');
    }
  };

  return (
    <Section
      icon={Tags}
      title="کاتالوگ دروس مدرسه"
      hint="تگ تحلیلی/حفظی طول بلوک و استراحت را عوض می‌کند و از چسباندن دو بلوک سنگین به هم جلوگیری می‌کند."
    >
      {isLoading && <p className="text-xs" style={{ color: CC.muted }}>در حال بارگذاری…</p>}
      <ul className="flex flex-col gap-2 mb-3">
        {(data?.subjects || []).map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
            style={{ background: CC.pageBg }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: CC.ink }}>{s.name}</p>
              <p className="text-[11px]" style={{ color: CC.muted }}>
                {(s.tags || []).join('، ') || 'بدون تگ'} · اهمیت {s.default_priority}
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] text-red-500"
              onClick={() => remove.mutate(s.name)}
            >
              حذف
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSave} className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام درس (مثلاً ریاضی)"
          required
          className="text-sm rounded-xl px-3 py-2.5 outline-none"
          style={{ border: `1px solid ${CC.border}`, color: CC.ink }}
        />
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((opt) => {
            const on = tags.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTag(opt.value)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  background: on ? CC.brandSoft : '#fff',
                  color: on ? CC.brandStrong : CC.muted,
                  border: `1px solid ${on ? CC.brandMid : CC.border}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <label className="text-[11px]" style={{ color: CC.muted }}>
          اهمیت پیش‌فرض {priority}
          <input
            type="range" min={1} max={5} value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
        </label>
        <button
          type="submit"
          disabled={upsert.isPending || !name.trim()}
          className="text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-50"
          style={{ background: CC.brandSoft, color: CC.brandStrong }}
        >
          {upsert.isPending ? '…' : 'ثبت درس'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </Section>
  );
}

export function SettingsDesktop() {
  return (
    <DesktopPageShell>
      <ProfileDesktop />
    </DesktopPageShell>
  );
}

export function SettingsMobile({ onMenuClick }) {
  return (
    <MobilePageShell hideHeader>
      <ProfileMobile onMenuClick={onMenuClick} />
    </MobilePageShell>
  );
}
