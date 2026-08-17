import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { queryClient } from '../lib/queryClient';
import { toEnDigits } from '../lib/persianDigits';
import WebInstallButton from '../components/WebInstallButton';

const inputClass =
  'w-full px-4 py-3 bg-card/50 text-ink rounded-xl border border-edge-2 ' +
  'focus:outline-none focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 transition-all';

const PasswordField = ({ value, onChange, placeholder, show, onToggle, disabled }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      dir="ltr"
      className={`${inputClass} pl-4 pr-11 text-left`}
      disabled={disabled}
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3
                 hover:text-brand focus:outline-none transition-colors"
    >
      {show ? <FiEye className="w-5 h-5" /> : <FiEyeOff className="w-5 h-5" />}
    </button>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone  2: password  3: profile
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  /** کاربر از قبل ساخته شده (مدیر/مشاور) ولی هنوز رمز ندارد */
  const [needsFirstPassword, setNeedsFirstPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [olympiadField, setOlympiadField] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const gradeOptions = [
    { value: '7',        label: 'هفتم' },
    { value: '8',        label: 'هشتم' },
    { value: '9',        label: 'نهم' },
    { value: '10',       label: 'دهم' },
    { value: '11',       label: 'یازدهم' },
    { value: '12',       label: 'دوازدهم' },
    { value: 'graduate', label: 'فارغ‌التحصیل' },
  ];

  const olympiadOptions = [
    { value: 'math',      label: 'ریاضی' },
    { value: 'physics',   label: 'فیزیک' },
    { value: 'chemistry', label: 'شیمی' },
    { value: 'biology',   label: 'زیست‌شناسی' },
    { value: 'computer',  label: 'کامپیوتر' },
    { value: 'astronomy', label: 'نجوم' },
    { value: 'none',      label: 'ندارم' },
  ];

  /* ── بررسی وضعیت لاگین ── */
  useEffect(() => {
    const redirectTo = (profile) => {
      let target = '/timer';
      if (profile.is_superadmin) target = '/superadmin';
      else if (profile.role === 'manager') target = '/manager';
      else if (profile.role === 'consultant') target = '/consultant';
      window.location.replace(target);
    };

    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // اگر پروفایل در کش باشه، فوری هدایت کن
      const cachedProfileStr = localStorage.getItem('userProfile');
      if (cachedProfileStr) {
        try {
          const profile = JSON.parse(cachedProfileStr);
          if (profile.is_profile_complete) {
            redirectTo(profile);
            return;
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      // اگر کشی نبود، منتظر API بمان
      try {
        const res = await authAPI.getProfile();
        const profile = res.data;
        localStorage.setItem('userProfile', JSON.stringify(profile));
        if (profile.is_profile_complete) {
          redirectTo(profile);
        }
      } catch (err) {
        // فقط در صورت 401 توکن رو پاک کن
        // خطای شبکه (DNS، timeout، آفلاین) نباید کاربر رو logout کنه
        if (err.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('userProfile');
          queryClient.clear();
        }
      }
    };
    checkAuth();
  }, [navigate]);

  /* ── سنجش قدرت رمز عبور ── */
  const checkPasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;

    if (strength === 0) return { text: '', color: '' };
    if (strength <= 2) return { text: 'ضعیف',  color: 'text-red-500' };
    if (strength <= 3) return { text: 'متوسط', color: 'text-yellow-500' };
    if (strength <= 4) return { text: 'خوب',   color: 'text-blue-500' };
    return               { text: 'عالی',       color: 'text-green-500' };
  };

  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setPassword(pass);
    setPasswordStrength(checkPasswordStrength(pass));
  };

  const normalizePhone = (raw) => toEnDigits(raw).replace(/\D/g, '');

  const phoneApiError = (err, fallback) => {
    if (!err.response) {
      return 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت یا تنظیمات سرور را بررسی کنید.';
    }
    return err.response?.data?.error || fallback;
  };

  /* ── مرحله ۱: بررسی شماره ── */
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(phoneNumber);
    if (normalized.length !== 11) {
      setError('شماره تلفن باید ۱۱ رقم باشد (مثال: 09123456789)');
      return;
    }
    if (!normalized.startsWith('09')) {
      setError('شماره موبایل باید با 09 شروع شود');
      return;
    }
    setPhoneNumber(normalized);
    setLoading(true);
    try {
      const res = await authAPI.checkPhone(normalized);
      const exists = !!res.data.exists;
      const hasPassword = !!res.data.has_password;
      setIsExistingUser(exists && hasPassword);
      setNeedsFirstPassword(exists && !hasPassword);
      setStep(2);
    } catch (err) {
      setError(phoneApiError(err, 'خطا در بررسی شماره تلفن'));
    } finally {
      setLoading(false);
    }
  };

  /* ── مرحله ۲: رمز عبور ── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const clearSessionData = () => {
      const quickNotes = localStorage.getItem('quickNotesList');
      const theme = localStorage.getItem('app-theme');
      localStorage.clear();
      sessionStorage.clear();
      if (quickNotes !== null) localStorage.setItem('quickNotesList', quickNotes);
      if (theme !== null) localStorage.setItem('app-theme', theme);
      queryClient.clear();
    };

    const redirectAfterAuth = (profile) => {
      let target = '/timer';
      if (profile.is_superadmin) target = '/superadmin';
      else if (profile.role === 'manager') target = '/manager';
      else if (profile.role === 'consultant') target = '/consultant';
      window.location.replace(target);
    };

    if (isExistingUser) {
      if (!password) { setError('رمز عبور را وارد کنید'); return; }
      setLoading(true);
      try {
        const res = await authAPI.login(phoneNumber, password);
        clearSessionData();
        localStorage.setItem('accessToken', res.data.access);
        localStorage.setItem('refreshToken', res.data.refresh);
        localStorage.setItem('isLoggedIn', 'true');
        const profile = res.data.profile;
        localStorage.setItem('userProfile', JSON.stringify(profile));
        if (profile.is_profile_complete) {
          redirectAfterAuth(profile);
        } else {
          setStep(3);
        }
      } catch (error) {
        setError(error.response?.data?.error || 'رمز عبور اشتباه است');
      } finally {
        setLoading(false);
      }
    } else {
      if (!password || !passwordConfirm) { setError('لطفا هر دو فیلد رمز عبور را پر کنید'); return; }
      if (password !== passwordConfirm) { setError('رمزهای عبور مطابقت ندارند'); return; }
      setLoading(true);
      try {
        const res = await authAPI.register(phoneNumber, password, passwordConfirm);
        clearSessionData();
        localStorage.setItem('accessToken', res.data.access);
        localStorage.setItem('refreshToken', res.data.refresh);
        localStorage.setItem('isLoggedIn', 'true');
        const profile = res.data.profile;
        localStorage.setItem('userProfile', JSON.stringify(profile));
        if (profile.is_profile_complete) {
          redirectAfterAuth(profile);
        } else {
          setStep(3);
        }
      } catch (error) {
        setError(error.response?.data?.error || 'خطا در ثبت نام');
      } finally {
        setLoading(false);
      }
    }
  };

  /* ── مرحله ۳: تکمیل پروفایل ── */
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName || !grade || !olympiadField || !invitationCode) {
      setError('لطفا تمام فیلدها را پر کنید');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({
        full_name: fullName,
        grade,
        olympiad_field: olympiadField,
        invitation_code: invitationCode || undefined,
      });
      const profile = res.data;
      localStorage.setItem('userProfile', JSON.stringify(profile));
      let target = '/timer';
      if (profile.is_superadmin) target = '/superadmin';
      else if (profile.role === 'manager') target = '/manager';
      else if (profile.role === 'consultant') target = '/consultant';
      window.location.replace(target);
    } catch (error) {
      setError(error.response?.data?.invitation_code?.[0] || 'خطا در تکمیل پروفایل');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <div className="h-full bg-page text-ink flex items-start sm:items-center justify-center
                    p-4 pt-16 sm:pt-4 relative overflow-y-auto z-0">
      {/* پترن نقطه‌ای */}
      <div className="absolute inset-0 opacity-10 -z-10 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, var(--t-grid-dot) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div
        className="fixed z-50"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top))',
          insetInlineStart: 'max(0.75rem, env(safe-area-inset-left))',
        }}
      >
        <WebInstallButton hideWhenStandalone={false} />
      </div>

      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8
                        border border-brand-2/30">
          {/* هدر */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 drop-shadow-lg">📚</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2 leading-snug px-1">
              دسکو، سکوی پرتاب تو
            </h1>
            <p className="text-brand/80">ورود و ثبت‌نام</p>
          </div>

          {/* پیام خطا */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl
                            text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* مرحله ۱: شماره تلفن */}
          {step === 1 && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <WebInstallButton variant="cta" hideWhenStandalone={false} />
              <div>
                <label className="block text-ink-2 mb-2 text-sm font-medium">شماره تلفن</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(normalizePhone(e.target.value).slice(0, 11))}
                  placeholder="09123456789"
                  dir="ltr"
                  className={`${inputClass} text-left`}
                  disabled={loading}
                  maxLength="11"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white
                           rounded-xl font-bold hover:from-emerald-600 hover:to-green-700
                           transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'در حال بررسی...' : 'ادامه'}
              </button>
            </form>
          )}

          {/* مرحله ۲: رمز عبور */}
          {step === 2 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <WebInstallButton variant="cta" hideWhenStandalone={false} />
              <button type="button"
                onClick={() => {
                  setStep(1);
                  setPassword('');
                  setPasswordConfirm('');
                  setError('');
                  setNeedsFirstPassword(false);
                }}
                className="text-ink-3 hover:text-ink text-sm mb-4">
                ← تغییر شماره تلفن
              </button>

              {isExistingUser ? (
                <>
                  <div className="text-center mb-6">
                    <p className="text-brand font-semibold mb-1">خوش آمدید!</p>
                    <p className="text-ink-3 text-sm">رمز عبور خود را وارد کنید</p>
                  </div>
                  <div>
                    <label className="block text-ink-2 mb-2 text-sm font-medium">رمز عبور</label>
                    <PasswordField
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      show={showPassword}
                      onToggle={() => setShowPassword((p) => !p)}
                      disabled={loading}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <p className="text-brand font-semibold mb-1">
                      {needsFirstPassword ? 'تعیین رمز عبور' : 'ثبت نام'}
                    </p>
                    <p className="text-ink-3 text-sm">
                      {needsFirstPassword
                        ? 'حساب شما ساخته شده؛ لطفاً رمز عبور خود را تعیین کنید'
                        : 'رمز عبور خود را انتخاب کنید'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-ink-2 mb-2 text-sm font-medium">رمز عبور</label>
                    <PasswordField
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Min 8 characters"
                      show={showPassword}
                      onToggle={() => setShowPassword((p) => !p)}
                      disabled={loading}
                    />
                    {passwordStrength?.text && (
                      <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-ink-2 mb-2 text-sm font-medium">تکرار رمز عبور</label>
                    <PasswordField
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      show={showPasswordConfirm}
                      onToggle={() => setShowPasswordConfirm((p) => !p)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white
                           rounded-xl font-bold hover:from-emerald-600 hover:to-green-700
                           transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'در حال پردازش...' : isExistingUser ? 'ورود' : 'ثبت نام و ادامه'}
              </button>
            </form>
          )}

          {/* مرحله ۳: تکمیل پروفایل */}
          {step === 3 && (
            <form onSubmit={handleCompleteProfile} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-brand font-semibold mb-1">تکمیل پروفایل</p>
                <p className="text-ink-3 text-sm">اطلاعات خود را وارد کنید</p>
              </div>

              <div>
                <label className="block text-ink-2 mb-2 text-sm font-medium">
                  نام و نام خانوادگی
                </label>
                <input type="text" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="نام و نام خانوادگی"
                  className={inputClass} disabled={loading} />
              </div>

              <div>
                <label className="block text-ink-2 mb-2 text-sm font-medium">پایه تحصیلی</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}
                  className={`${inputClass} cursor-pointer`} disabled={loading}>
                  <option value="" className="bg-card">انتخاب کنید...</option>
                  {gradeOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-ink-2 mb-2 text-sm font-medium">رشته المپیاد</label>
                <select value={olympiadField} onChange={(e) => setOlympiadField(e.target.value)}
                  className={`${inputClass} cursor-pointer`} disabled={loading}>
                  <option value="" className="bg-card">انتخاب کنید...</option>
                  {olympiadOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-ink-2 mb-2 text-sm font-medium">
                  کد دعوت مدرسه <span className="text-red-400">*</span>
                </label>
                <input type="text" value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="کد دعوت"
                  className={inputClass} disabled={loading} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white
                           rounded-xl font-bold hover:from-emerald-600 hover:to-green-700
                           transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'در حال ذخیره...' : 'تکمیل ثبت نام'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
