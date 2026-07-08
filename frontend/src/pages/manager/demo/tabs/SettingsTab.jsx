import { useState } from 'react';
import {
  Settings, Building2, Calendar, Bell, Shield, SlidersHorizontal,
  ChevronDown, Save, CheckCircle2, Download, Trash2, Lock, Mail, Phone, MapPin,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import {
  SETTINGS_SECTIONS,
  DEFAULT_SCHOOL_INFO,
  ACADEMIC_YEARS,
  NOTIFICATION_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  SYSTEM_OPTIONS,
  DEFAULT_SYSTEM,
} from '../data/settingsMockData';

function SaveFeedback({ show, message = 'تغییرات با موفقیت ذخیره شد' }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mr-3">
      <CheckCircle2 size={14} />
      {message}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? '#10B981' : '#E5E7EB' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ right: checked ? 2 : 22 }}
        />
      </button>
    </div>
  );
}

function FormField({ label, icon: Icon, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-3 rounded-2xl text-sm text-gray-700 outline-none placeholder:text-gray-400 ${Icon ? 'pr-10 pl-4' : 'px-4'}`}
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        />
      </div>
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-4 py-3 rounded-2xl text-sm text-gray-700 outline-none"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

function SectionIcon({ type, color = '#10B981' }) {
  const props = { size: 18, color };
  switch (type) {
    case 'school': return <Building2 {...props} />;
    case 'calendar': return <Calendar {...props} />;
    case 'bell': return <Bell {...props} />;
    case 'shield': return <Shield {...props} />;
    case 'sliders': return <SlidersHorizontal {...props} />;
    default: return <Settings {...props} />;
  }
}

function GeneralSettings() {
  const [form, setForm] = useState(DEFAULT_SCHOOL_INFO);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-1">اطلاعات مدرسه</h3>
      <p className="text-xs text-gray-500 mb-5">نام و اطلاعات تماس مدرسه در سامانه</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <FormField label="نام مدرسه" icon={Building2} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <FormField label="تلفن" icon={Phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormField label="ایمیل" icon={Mail} value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField label="آدرس" icon={MapPin} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      </div>
      <div className="flex items-center">
        <SaveFeedback show={saved} />
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Save size={16} />
          <span>ذخیره تغییرات</span>
        </button>
      </div>
    </div>
  );
}

function AcademicSettings() {
  const [year, setYear] = useState(ACADEMIC_YEARS[0]);
  const [termStart, setTermStart] = useState('۱۴۰۴/۰۷/۰۱');
  const [termEnd, setTermEnd] = useState('۱۴۰۵/۰۳/۳۱');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleActivate = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-1">سال تحصیلی</h3>
      <p className="text-xs text-gray-500 mb-5">مدیریت سال جاری و بازه زمانی ترم</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <FormSelect label="سال تحصیلی فعال" value={year} onChange={setYear} options={ACADEMIC_YEARS} />
        <FormField label="شروع ترم" value={termStart} onChange={setTermStart} placeholder="۱۴۰۴/۰۷/۰۱" />
        <FormField label="پایان ترم" value={termEnd} onChange={setTermEnd} placeholder="۱۴۰۵/۰۳/۳۱" />
      </div>
      <div className="flex items-center flex-wrap gap-2">
        <SaveFeedback show={saved} message={saved ? 'سال تحصیلی به‌روزرسانی شد' : ''} />
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Save size={16} />
          <span>ذخیره</span>
        </button>
        <button
          onClick={handleActivate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: '#fff', border: '1px solid #10B981', color: '#10B981' }}
        >
          <Calendar size={16} />
          <span>فعال‌سازی سال جدید</span>
        </button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATIONS);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => {
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <h3 className="font-bold text-gray-900 text-sm mb-1">تنظیمات اعلان‌ها</h3>
      <p className="text-xs text-gray-500 mb-4">انتخاب رویدادهایی که باید اطلاع‌رسانی شوند</p>
      <div className="mb-5">
        {NOTIFICATION_SETTINGS.map((item) => (
          <ToggleSwitch
            key={item.id}
            label={item.label}
            desc={item.desc}
            checked={settings[item.id]}
            onChange={() => toggle(item.id)}
          />
        ))}
      </div>
      <div className="flex items-center">
        <SaveFeedback show={saved} />
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Save size={16} />
          <span>اعمال تنظیمات</span>
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleChangePassword = () => {
    if (!currentPass || !newPass) {
      setFeedback({ type: 'error', text: 'لطفاً تمام فیلدها را پر کنید' });
      return;
    }
    if (newPass !== confirmPass) {
      setFeedback({ type: 'error', text: 'رمز عبور جدید با تکرار آن یکسان نیست' });
      return;
    }
    if (newPass.length < 6) {
      setFeedback({ type: 'error', text: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
      return;
    }
    setFeedback({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5" style={CARD_STYLE}>
        <h3 className="font-bold text-gray-900 text-sm mb-1">تغییر رمز عبور</h3>
        <p className="text-xs text-gray-500 mb-5">رمز عبور حساب مدیر سیستم</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormField label="رمز فعلی" icon={Lock} type="password" value={currentPass} onChange={setCurrentPass} placeholder="••••••••" />
          <FormField label="رمز جدید" icon={Lock} type="password" value={newPass} onChange={setNewPass} placeholder="••••••••" />
          <FormField label="تکرار رمز جدید" icon={Lock} type="password" value={confirmPass} onChange={setConfirmPass} placeholder="••••••••" />
        </div>
        {feedback && (
          <p
            className="text-xs font-medium mb-3"
            style={{ color: feedback.type === 'success' ? '#059669' : '#DC2626' }}
          >
            {feedback.text}
          </p>
        )}
        <button
          onClick={handleChangePassword}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#10B981' }}
        >
          <Lock size={16} />
          <span>تغییر رمز عبور</span>
        </button>
      </div>

      <div className="rounded-3xl p-5" style={CARD_STYLE}>
        <ToggleSwitch
          label="ورود دو مرحله‌ای (2FA)"
          desc="ارسال کد تأیید به موبایل هنگام ورود"
          checked={twoFactor}
          onChange={setTwoFactor}
        />
      </div>
    </div>
  );
}

function SystemSettings() {
  const [prefs, setPrefs] = useState(DEFAULT_SYSTEM);
  const [actionMsg, setActionMsg] = useState(null);

  const handleSave = () => {
    setActionMsg('تنظیمات سیستم ذخیره شد');
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleBackup = () => {
    setActionMsg('پشتیبان‌گیری آغاز شد. فایل به‌زودی آماده دانلود می‌شود.');
    setTimeout(() => setActionMsg(null), 3500);
  };

  const handleClearCache = () => {
    setActionMsg('حافظه موقت پاکسازی شد');
    setTimeout(() => setActionMsg(null), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5" style={CARD_STYLE}>
        <h3 className="font-bold text-gray-900 text-sm mb-1">ترجیحات سیستم</h3>
        <p className="text-xs text-gray-500 mb-5">زبان، تاریخ و نمایش</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <FormSelect label="زبان رابط" value={prefs.language} onChange={(v) => setPrefs({ ...prefs, language: v })} options={SYSTEM_OPTIONS.languages} />
          <FormSelect label="فرمت تاریخ" value={prefs.dateFormat} onChange={(v) => setPrefs({ ...prefs, dateFormat: v })} options={SYSTEM_OPTIONS.dateFormats} />
          <FormSelect label="منطقه زمانی" value={prefs.timezone} onChange={(v) => setPrefs({ ...prefs, timezone: v })} options={SYSTEM_OPTIONS.timezones} />
        </div>
        <ToggleSwitch
          label="حالت فشرده"
          desc="نمایش فشرده‌تر جداول و لیست‌ها"
          checked={prefs.compactMode}
          onChange={(v) => setPrefs({ ...prefs, compactMode: v })}
        />
        <div className="flex items-center mt-5">
          <SaveFeedback show={!!actionMsg && actionMsg.includes('ذخیره')} message={actionMsg} />
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: '#10B981' }}
          >
            <Save size={16} />
            <span>ذخیره</span>
          </button>
        </div>
      </div>

      <div className="rounded-3xl p-5" style={CARD_STYLE}>
        <h3 className="font-bold text-gray-900 text-sm mb-1">نگهداری داده</h3>
        <p className="text-xs text-gray-500 mb-4">پشتیبان‌گیری و بهینه‌سازی</p>
        {actionMsg && !actionMsg.includes('ذخیره') && (
          <p className="text-xs font-medium text-emerald-600 mb-3">{actionMsg}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: '#DBEAFE', color: '#2563EB' }}
          >
            <Download size={16} />
            <span>پشتیبان‌گیری</span>
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: '#FEF3C7', color: '#D97706' }}
          >
            <Trash2 size={16} />
            <span>پاکسازی حافظه موقت</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const SECTION_CONTENT = {
  general: GeneralSettings,
  academic: AcademicSettings,
  notifications: NotificationSettings,
  security: SecuritySettings,
  system: SystemSettings,
};

function SettingsPageHeader({ compact }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#F3F4F6' }}
      >
        <Settings size={22} color="#6B7280" />
      </div>
      <div>
        <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>تنظیمات</h1>
        <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          پیکربندی مدرسه، اعلان‌ها و امنیت سامانه
        </p>
      </div>
    </div>
  );
}

function SettingsNav({ active, onChange, compact }) {
  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap flex-shrink-0"
            style={{
              background: active === section.id ? '#10B981' : '#fff',
              color: active === section.id ? '#fff' : '#6B7280',
              border: active === section.id ? 'none' : '1px solid #E5E7EB',
            }}
          >
            <SectionIcon type={section.icon} color={active === section.id ? '#fff' : '#6B7280'} />
            {section.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="rounded-3xl p-3 sticky top-24" style={CARD_STYLE}>
      {SETTINGS_SECTIONS.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-right"
            style={{
              background: isActive ? '#D1FAE5' : 'transparent',
              color: isActive ? '#059669' : '#6B7280',
            }}
          >
            <SectionIcon type={section.icon} color={isActive ? '#059669' : '#6B7280'} />
            <span className="font-medium text-sm">{section.label}</span>
            {isActive && (
              <div className="mr-auto w-1.5 h-5 rounded-full" style={{ background: '#10B981' }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function SettingsBody({ compact }) {
  const [activeSection, setActiveSection] = useState('general');
  const ActiveContent = SECTION_CONTENT[activeSection];
  const padding = compact ? 'px-5 py-5 space-y-5' : 'px-8 py-6 space-y-6';

  return (
    <div className={padding}>
      <SettingsPageHeader compact={compact} />

      {compact ? (
        <>
          <SettingsNav active={activeSection} onChange={setActiveSection} compact />
          <ActiveContent />
        </>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <SettingsNav active={activeSection} onChange={setActiveSection} />
          </div>
          <div className="col-span-9">
            <ActiveContent />
          </div>
        </div>
      )}

      {!compact && <div className="h-6" />}
    </div>
  );
}

export function SettingsDesktop() {
  return (
    <DesktopPageShell>
      <SettingsBody />
    </DesktopPageShell>
  );
}

export function SettingsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <SettingsBody compact />
    </MobilePageShell>
  );
}
