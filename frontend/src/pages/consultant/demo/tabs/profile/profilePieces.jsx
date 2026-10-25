import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Clock,
  Columns3,
  Leaf,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Plane,
  Plus,
  Save,
  Settings,
  Star,
  Tags,
  Trash2,
  Users,
} from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';
import {
  HOUR_OPTIONS,
  NOTIFICATION_OPTIONS,
  RESERVE_OPTIONS,
  SUBJECT_TAGS,
  WORK_DAYS,
  useSubjectCatalogForm,
  useSupportMessage,
} from './profileModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';
export const CARD = 'bg-white rounded-[24px] border border-[#E5EEE9] shadow-[0_10px_28px_rgba(18,70,45,0.05)]';

export function ConsultantPortrait({ className = 'w-[88px] h-[88px]' }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} shrink-0`} aria-hidden="true">
      <circle cx="60" cy="60" r="58" fill="#E7F6EC" />
      <path d="M18 78c8-28 22-42 42-42s34 14 42 42v22H18V78z" fill="#0F6A49" />
      <path d="M34 46c2-18 14-30 26-30 8 0 16 6 20 16-10 2-22 8-28 20-6-4-14-6-18-6z" fill="#146B45" />
      <ellipse cx="60" cy="62" rx="22" ry="24" fill="#F6D7C3" />
      <path d="M40 50c6-16 34-16 42 2-8 6-16 8-21 8s-15-4-21-10z" fill="#0F6A49" />
      <circle cx="52" cy="62" r="2.2" fill="#3A2A24" />
      <circle cx="70" cy="62" r="2.2" fill="#3A2A24" />
      <path d="M54 74c4 4 10 4 14 0" fill="none" stroke="#C47B6A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileNotice({ notice, tone = 'ok' }) {
  if (!notice) return null;
  const error = tone === 'err';
  return (
    <p role="status" className={`rounded-2xl text-sm font-bold px-3 py-2 ${error ? 'bg-red-50 text-red-700' : 'bg-[#E6F6EC] text-[#0F6A49]'}`}>
      {notice}
    </p>
  );
}

export function ProfileStatusBanner({ profile }) {
  if (profile.loading) {
    return (
      <p className="rounded-2xl bg-white border border-[#E5EEE9] text-sm font-bold text-[#7C8B85] px-3 py-2">
        در حال دریافت تنظیمات حساب…
      </p>
    );
  }
  if (!profile.loadError) return null;
  return (
    <div className="rounded-2xl bg-red-50 text-red-700 text-sm px-3 py-2 flex items-center justify-between gap-2">
      <p className="min-w-0">بارگذاری تنظیمات حساب ناموفق بود.</p>
      <button
        type="button"
        onClick={() => profile.refetch()}
        className={`shrink-0 h-8 px-2.5 rounded-xl bg-white text-xs font-extrabold ${FOCUS}`}
      >
        تلاش دوباره
      </button>
    </div>
  );
}

export function Switch({ on, onToggle, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition shrink-0 ${FOCUS}`}
      style={{ background: on ? PANEL.green : '#D5E0DB' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ right: on ? '1.35rem' : '0.15rem' }}
      />
    </button>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="inline-flex items-center gap-2 text-[15px] font-extrabold text-[#17352C]">
      <Icon size={16} color={PANEL.green} />
      {children}
    </h2>
  );
}

export function ProfileHero({ profile, name }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-[#17352C] truncate">{name}</h2>
            {profile.onLeave && (
              <span className="rounded-full bg-[#FFF1E6] text-[#C2410C] text-[11px] font-bold px-2 py-0.5">در مرخصی</span>
            )}
          </div>
          <p className="text-sm text-[#7C8B85] mt-0.5">مشاور تحصیلی</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#F4F7F5] px-3 py-2 min-w-0">
              <p className="text-[10px] text-[#7C8B85]">شماره تماس</p>
              <p className="text-xs font-extrabold text-[#17352C] truncate mt-0.5">{profile.identity.phone || '—'}</p>
            </div>
            <div className="rounded-2xl bg-[#F4F7F5] px-3 py-2 min-w-0">
              <p className="text-[10px] text-[#7C8B85]">مدرسه</p>
              <p className="text-xs font-extrabold text-[#17352C] truncate mt-0.5">{profile.identity.school || '—'}</p>
            </div>
          </div>
          <p className="text-xs text-[#7C8B85] mt-2">کد مشاور: {faNum(1404278)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-extrabold text-[#17352C]">{faNum(96)}٪</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#A16207]">
              <Star size={14} fill="#E0A106" color="#E0A106" />
              رضایت دانش‌آموزان
            </span>
            <span className="inline-flex gap-0.5" aria-label="پنج ستاره">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={13} fill="#E0A106" color="#E0A106" />
              ))}
            </span>
          </div>
        </div>
        <ConsultantPortrait />
      </div>

      <div className="mt-4 pt-4 border-t border-[#E5EEE9]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#17352C]">ظرفیت مشاوره</p>
            <p className="text-xs text-[#7C8B85] mt-1">
              {faNum(42)} دانش‌آموز فعال از سقف {faNum(48)} نفر
            </p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#E7F6EC] text-[#0F6A49] inline-flex items-center justify-center shrink-0">
            <Users size={16} />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-[#E6F6EC] overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-[#0F6A49]" style={{ width: '87%' }} />
          </div>
          <span className="text-sm font-extrabold text-[#0F6A49]">{faNum(87)}٪</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F6EC] text-[#0F6A49] text-xs font-bold px-2.5 py-1">
            {faNum(33)} عادی
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1E6] text-[#C2410C] text-xs font-bold px-2.5 py-1">
            {faNum(9)} نیازمند توجه
          </span>
        </div>
      </div>
    </section>
  );
}

export function WorkCalendar({ profile }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={CalendarDays}>تقویم کاری</SectionTitle>
      <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2">
        {WORK_DAYS.map((day) => {
          const active = profile.days[day.id];
          return (
            <button
              key={day.id}
              type="button"
              aria-pressed={active}
              onClick={() => profile.toggleDay(day.id)}
              className={`rounded-2xl px-1 py-2 text-center border ${FOCUS}`}
              style={{
                background: active ? '#E7F6EC' : '#F4F7F5',
                borderColor: active ? '#C6E8D4' : '#E5EEE9',
                color: active ? '#0F6A49' : '#7C8B85',
              }}
            >
              <span className="block text-[10px] sm:text-xs font-extrabold leading-4">{day.label}</span>
              <span className="block text-[10px] mt-0.5">{active ? 'فعال' : 'غیرفعال'}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-bold text-[#17352C]">
          <Clock size={15} color={PANEL.green} />
          ساعت کاری
        </span>
        <span className="font-extrabold text-[#0F6A49]">{profile.hourText}</span>
      </div>
      <div className="mt-3">
        <p className="text-xs font-bold text-[#7C8B85] mb-2 inline-flex items-center gap-1">
          <CalendarDays size={13} />
          نوبت‌های آزاد امروز
        </p>
        <div className="flex flex-wrap gap-2">
          {profile.slots.map((slot) => (
            <span key={slot} className="rounded-xl bg-[#F4F7F5] text-[#17352C] text-xs font-bold px-3 py-1.5">
              {slot}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SmartSettings({ profile, onOpenStudents }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={Settings}>تنظیمات هوشمند</SectionTitle>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#17352C]">عدم ثبت گزارش بیش از {faNum(2)} روز</p>
            <p className="text-[11px] text-[#7C8B85] mt-0.5 leading-5">
              اگر دانش‌آموز بیش از {faNum(2)} روز گزارش ندهد، به شما هشدار داده می‌شود.
            </p>
          </div>
          <Switch
            on={profile.rules.report}
            onToggle={() => profile.toggleRule('report')}
            label="هشدار عدم ثبت گزارش"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#17352C]">{`افت ساعت مطالعه ${profile.thresholdLabel}٪`}</p>
            <p className="text-[11px] text-[#7C8B85] mt-0.5 leading-5">
              {`در صورت کاهش ${profile.thresholdLabel}٪ ساعت مطالعه، دانش‌آموز در لیست نیازمند توجه قرار می‌گیرد.`}
            </p>
          </div>
          <Switch
            on={profile.rules.study}
            onToggle={() => profile.toggleRule('study')}
            label="هشدار افت ساعت مطالعه"
          />
        </div>
        <button
          type="button"
          onClick={onOpenStudents}
          className={`self-start inline-flex items-center gap-1 rounded-full bg-[#FDECEC] text-[#A33B3B] text-xs font-bold px-2.5 py-1 ${FOCUS}`}
        >
          <AlertTriangle size={13} />
          لیست نیازمند توجه
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-xs font-bold text-[#17352C]">آستانه افت ساعت مطالعه:</span>
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              aria-label="کم کردن آستانه"
              onClick={() => profile.changeThreshold(profile.threshold - 5)}
              className={`w-8 h-8 rounded-xl border border-[#E5EEE9] text-[#17352C] font-bold ${FOCUS}`}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center font-extrabold text-[#0F6A49]">{`${profile.thresholdLabel}٪`}</span>
            <button
              type="button"
              aria-label="زیاد کردن آستانه"
              onClick={() => profile.changeThreshold(profile.threshold + 5)}
              className={`w-8 h-8 rounded-xl border border-[#E5EEE9] text-[#17352C] font-bold ${FOCUS}`}
            >
              +
            </button>
          </span>
        </div>
      </div>
    </section>
  );
}

export function ReadyReplies({ profile }) {
  return (
    <section data-profile-replies className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={MessageSquare}>پاسخ‌های آماده و ایموجی‌های پرکاربرد</SectionTitle>
      <ul className="mt-3 flex flex-col gap-2">
        {profile.replies.map((reply) => (
          <li key={reply.id} className="flex items-center gap-2 rounded-2xl border border-[#E5EEE9] px-3 py-2">
            <span className="text-base shrink-0" aria-hidden="true">{reply.emoji}</span>
            {profile.editingId === reply.id ? (
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <input
                  aria-label={`عنوان پاسخ ${reply.text}`}
                  value={reply.title}
                  onChange={(event) => profile.updateReply(reply.id, { title: event.target.value })}
                  placeholder="عنوان"
                  className={`bg-transparent text-xs font-bold text-[#7C8B85] outline-none ${FOCUS}`}
                />
                <input
                  aria-label={`ویرایش ${reply.text}`}
                  value={reply.text}
                  onChange={(event) => profile.updateReply(reply.id, { text: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') profile.startEdit(reply.id);
                  }}
                  className={`bg-transparent text-sm font-bold text-[#17352C] outline-none ${FOCUS}`}
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                {reply.title ? <p className="text-[11px] font-bold text-[#7C8B85] truncate">{reply.title}</p> : null}
                <p className="text-sm font-bold text-[#17352C] truncate">{reply.text}</p>
              </div>
            )}
            <button
              type="button"
              aria-label={`ویرایش پاسخ ${reply.text}`}
              onClick={() => profile.startEdit(reply.id)}
              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#5E6E68] hover:bg-[#F4F7F5] ${FOCUS}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={`حذف پاسخ ${reply.text}`}
              onClick={() => profile.removeReply(reply.id)}
              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#A33B3B] hover:bg-[#FDECEC] ${FOCUS}`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {!profile.replies.length && (
          <li className="text-xs text-[#7C8B85]">هنوز پاسخ آماده‌ای نمانده.</li>
        )}
      </ul>
      <p className="mt-3 text-[11px] font-bold text-[#7C8B85]">ایموجی‌های پرکاربرد:</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['👍', '🔥', '🎯', '❤️', '💡', '⚠️'].map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`ایموجی ${item}`}
            aria-pressed={profile.emoji === item}
            onClick={() => profile.pickEmoji(item)}
            className={`w-8 h-8 rounded-xl text-base ${FOCUS} ${profile.emoji === item ? 'bg-[#E7F6EC] ring-1 ring-[#0F6A49]' : 'bg-[#F4F7F5]'}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          aria-label="ایموجی‌های بیشتر"
          onClick={() => profile.pickEmoji(profile.emoji === '🌟' ? '📚' : '🌟')}
          className={`w-8 h-8 rounded-xl text-[#0F6A49] bg-[#F4F7F5] font-bold ${FOCUS}`}
        >
          +
        </button>
      </div>
      {profile.composing && (
        <div className="mt-3 flex items-center gap-2">
          <span aria-hidden="true">{profile.emoji}</span>
          <input
            autoFocus
            aria-label="متن پاسخ آماده"
            value={profile.draft}
            onChange={(event) => profile.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') profile.commitDraft();
            }}
            placeholder="متن پاسخ..."
            className={`flex-1 min-w-0 h-10 rounded-xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
          />
        </div>
      )}
      <button
        type="button"
        onClick={profile.composing ? profile.commitDraft : profile.beginCompose}
        className={`mt-3 h-10 px-3 rounded-xl border border-dashed border-[#C5DDD2] text-sm font-bold text-[#0F6A49] inline-flex items-center gap-1 ${FOCUS}`}
      >
        <Plus size={15} />
        {profile.composing ? 'ثبت پاسخ' : 'افزودن پاسخ آماده'}
      </button>
    </section>
  );
}

export function Availability({ profile }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={Clock}>تنظیمات دسترسی و حضور</SectionTitle>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#17352C]">روزهای کاری:</span>
          <div className="flex flex-wrap gap-1.5">
            {WORK_DAYS.map((day) => {
              const active = profile.days[day.id];
              return (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => profile.toggleDay(day.id)}
                  className={`h-8 px-2.5 rounded-full text-[11px] font-bold ${FOCUS}`}
                  style={{
                    background: active ? PANEL.green : '#F4F7F5',
                    color: active ? '#fff' : '#5E6E68',
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#17352C]">
          ساعت‌های کاری:
          <select
            aria-label="ساعت‌های کاری"
            value={profile.hourId}
            onChange={(event) => profile.setHourId(event.target.value)}
            className={`h-10 rounded-xl border border-[#E5EEE9] bg-white px-3 text-sm font-bold ${FOCUS}`}
          >
            {HOUR_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
            {profile.hourId === 'custom' && <option value="custom">ساعت دلخواه</option>}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-bold text-[#7C8B85]">
            شروع
            <input
              type="time"
              aria-label="ساعت شروع کار"
              value={profile.start}
              onChange={(event) => profile.setStart(event.target.value)}
              className={`mt-1 w-full h-10 rounded-xl border border-[#E5EEE9] bg-white px-2 text-sm font-bold text-[#17352C] ${FOCUS}`}
            />
          </label>
          <label className="text-[11px] font-bold text-[#7C8B85]">
            پایان
            <input
              type="time"
              aria-label="ساعت پایان کار"
              value={profile.end}
              onChange={(event) => profile.setEnd(event.target.value)}
              className={`mt-1 w-full h-10 rounded-xl border border-[#E5EEE9] bg-white px-2 text-sm font-bold text-[#17352C] ${FOCUS}`}
            />
          </label>
        </div>
        <label className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#17352C]">
          نوبت‌های خالی برای رزرو:
          <select
            aria-label="تعداد نوبت خالی"
            value={profile.reserve}
            onChange={(event) => profile.setReserve(Number(event.target.value))}
            className={`h-10 rounded-xl border border-[#E5EEE9] bg-white px-3 text-sm font-bold ${FOCUS}`}
          >
            {RESERVE_OPTIONS.map((count) => (
              <option key={count} value={count}>{faNum(count)} نوبت</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        data-profile-action="save"
        onClick={profile.save}
        disabled={profile.saving}
        className={`mt-4 h-11 px-4 rounded-2xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-70 ${FOCUS}`}
        style={{ background: PANEL.green }}
      >
        <Save size={16} />
        {profile.saving ? 'در حال ذخیره…' : profile.saved ? 'ذخیره شد' : 'ذخیره تغییرات'}
      </button>
    </section>
  );
}

export function RosterColumns({ profile }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={Columns3}>ستون‌های فهرست دانش‌آموزان</SectionTitle>
      <p className="mt-1 text-[11px] leading-5 text-[#7C8B85]">نام همیشه دیده می‌شود. بقیه ستون‌ها را برای کارت دانش‌آموز روشن یا خاموش کنید.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.availableColumns.map((column) => {
          const on = profile.columns.includes(column.key);
          return (
            <button
              key={column.key}
              type="button"
              aria-pressed={on}
              onClick={() => profile.toggleColumn(column.key)}
              className={`h-8 px-2.5 rounded-full text-[11px] font-bold ${FOCUS}`}
              style={{ background: on ? '#0F6A49' : '#F4F7F5', color: on ? '#fff' : '#5E6E68' }}
            >
              {column.label}{column.placeholder ? ' *' : ''}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[#7C8B85]">* تا اتصال داده واقعی خالی می‌ماند</p>
    </section>
  );
}

export function NotificationSettings({ profile }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={Bell}>اعلان‌ها</SectionTitle>
      <div className="mt-3 flex flex-col gap-3">
        {NOTIFICATION_OPTIONS.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#17352C]">{item.label}</p>
              <p className="text-[11px] text-[#7C8B85] mt-0.5">{item.hint}</p>
            </div>
            <Switch
              on={!!profile.notifications[item.id]}
              onToggle={() => profile.toggleNotification(item.id)}
              label={item.label}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SubjectCatalogCard() {
  const catalog = useSubjectCatalogForm();
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={Tags}>کاتالوگ دروس</SectionTitle>
      <p className="mt-1 text-[11px] leading-5 text-[#7C8B85]">
        تگ تحلیلی یا حفظی طول بلوک و استراحت را عوض می‌کند و از چسبیدن دو بلوک سنگین به هم جلوگیری می‌کند.
      </p>
      {catalog.loading && <p className="mt-3 text-xs text-[#7C8B85]">در حال دریافت درس‌ها…</p>}
      {catalog.failed && (
        <button type="button" onClick={() => catalog.refetch()} className={`mt-3 text-xs font-bold text-[#A33B3B] ${FOCUS}`}>
          دریافت درس‌ها ناموفق بود. تلاش دوباره
        </button>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {catalog.subjects.map((subject) => (
          <li key={subject.name} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F4F7F5] px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#17352C] truncate">{subject.name}</p>
              <p className="text-[11px] text-[#7C8B85]">
                {(subject.tags || []).map((tag) => SUBJECT_TAGS.find((item) => item.value === tag)?.label || tag).join('، ') || 'بدون تگ'}
                {' · '}
                اهمیت {faNum(subject.default_priority)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => catalog.removeSubject(subject.name)}
              className={`text-[11px] font-bold text-[#A33B3B] shrink-0 ${FOCUS}`}
            >
              حذف
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={catalog.name}
          onChange={(event) => catalog.setName(event.target.value)}
          placeholder="نام درس، مثلاً ریاضی"
          aria-label="نام درس کاتالوگ"
          className={`h-10 rounded-xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
        />
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_TAGS.map((tag) => {
            const on = catalog.tags.includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                aria-pressed={on}
                onClick={() => catalog.toggleTag(tag.value)}
                className={`h-8 px-2.5 rounded-full text-[11px] font-bold ${FOCUS}`}
                style={{ background: on ? '#E7F6EC' : '#fff', color: on ? '#0F6A49' : '#5E6E68', border: '1px solid #E5EEE9' }}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#17352C]">اهمیت پیش‌فرض {faNum(catalog.priority)}</p>
          <div className="mt-1.5 grid grid-cols-5 gap-1" role="group" aria-label="اهمیت پیش‌فرض درس">
            {[1, 2, 3, 4, 5].map((step) => (
              <button
                key={step}
                type="button"
                aria-label={`اهمیت ${faNum(step)}`}
                aria-pressed={catalog.priority === step}
                onClick={() => catalog.setPriority(step)}
                className={`h-2.5 rounded-full ${FOCUS}`}
                style={{ background: step <= catalog.priority ? '#0F6A49' : '#E5EEE9' }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={catalog.saveSubject}
          disabled={catalog.saving || !catalog.name.trim()}
          className={`h-10 rounded-xl text-white text-sm font-extrabold disabled:opacity-50 ${FOCUS}`}
          style={{ background: PANEL.green }}
        >
          {catalog.saving ? 'در حال ثبت…' : 'ثبت درس'}
        </button>
        {catalog.error && <p className="text-xs font-bold text-red-600">{catalog.error}</p>}
      </div>
    </section>
  );
}

export function SupportCard({ note }) {
  const support = useSupportMessage(note);
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <SectionTitle icon={LifeBuoy}>ارتباط با پشتیبانی</SectionTitle>
      <p className="mt-1 text-[11px] leading-5 text-[#7C8B85]">{support.note}</p>
      <textarea
        value={support.message}
        onChange={(event) => support.setMessage(event.target.value)}
        rows={3}
        aria-label="پیام پشتیبانی"
        placeholder="مشکل یا درخواست خود را بنویسید"
        className={`mt-3 w-full rounded-2xl border border-[#E5EEE9] px-3 py-2 text-sm resize-none ${FOCUS}`}
      />
      <button
        type="button"
        onClick={support.send}
        disabled={!support.message.trim() || support.state.status === 'sending'}
        className={`mt-2 h-10 px-3 rounded-xl text-sm font-extrabold text-[#0F6A49] bg-[#E7F6EC] disabled:opacity-50 ${FOCUS}`}
      >
        {support.state.status === 'sending' ? 'در حال ارسال…' : 'ارسال پیام'}
      </button>
      {support.state.text && (
        <p className={`mt-2 text-xs font-bold ${support.state.status === 'err' ? 'text-red-600' : 'text-[#0F6A49]'}`}>
          {support.state.text}
        </p>
      )}
    </section>
  );
}

export function ProfileActions({ profile, onLogout, onMessages }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={profile.onLeave}
        disabled={profile.savingLeave}
        onClick={() => profile.setOnLeave(!profile.onLeave)}
        className={`h-10 px-3 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border ${FOCUS}`}
        style={{
          background: profile.onLeave ? '#FFF1E6' : '#fff',
          borderColor: profile.onLeave ? '#F3D4B0' : '#E5EEE9',
          color: '#17352C',
        }}
      >
        <Plane size={15} />
        {profile.onLeave ? 'بازگشت به حالت فعال' : 'تغییر وضعیت به مرخصی'}
      </button>
      <button
        type="button"
        onClick={onMessages}
        className={`h-10 px-3 rounded-2xl bg-white border border-[#E5EEE9] text-sm font-bold text-[#17352C] inline-flex items-center gap-1.5 ${FOCUS}`}
      >
        <MessageSquare size={15} />
        مدیریت پیام‌های آماده
      </button>
      <button
        type="button"
        onClick={onLogout}
        className={`h-10 px-3 rounded-2xl bg-white border border-[#F3C1C1] text-sm font-bold text-[#C2410C] inline-flex items-center gap-1.5 ${FOCUS}`}
      >
        خروج از حساب
      </button>
    </div>
  );
}

export function ProfileHeading() {
  return (
    <div className="min-w-0">
      <h1 className="inline-flex items-center gap-2 text-[22px] font-extrabold text-[#17352C]">
        <Leaf size={18} color={PANEL.green} />
        پروفایل مشاور
      </h1>
      <p className="text-xs text-[#7C8B85] mt-1">تنظیمات حساب و مدیریت مشاوره</p>
      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E7F6EC] text-[#0F6A49] text-[11px] font-bold px-2.5 py-1">
        {faNum(4)} پیشنهاد جدید از آخرین ورود شما
      </p>
    </div>
  );
}
