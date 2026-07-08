import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowForward, MdIosShare, MdOutlineInstallMobile, MdGetApp } from 'react-icons/md';
import { FaApple, FaAndroid, FaWindows } from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FiPlusSquare, FiChevronDown } from 'react-icons/fi';
import { usePWA } from '../hooks/PWAContext';

/** آدرس APK؛ در پروداکشن کنار index.html یا via VITE_ANDROID_APK_URL */
function getAndroidApkUrl() {
  const fromEnv = import.meta.env.VITE_ANDROID_APK_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim();
  }
  return `${window.location.origin}/Desko.apk`;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const { deferredPrompt, promptInstall } = usePWA();
  const [detectedOS, setDetectedOS] = useState('android');
  const [activeGuide, setActiveGuide] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setDetectedOS('ios');
      setActiveGuide('ios');
    } else if (/Win/i.test(ua)) {
      setDetectedOS('windows');
      setActiveGuide('windows');
    } else if (/android/i.test(ua)) {
      setDetectedOS('android');
      setActiveGuide('android');
    } else {
      setDetectedOS('windows');
      setActiveGuide('windows');
    }
  }, []);

  const handleAndroidDownloadApk = useCallback(() => {
    const url = getAndroidApkUrl();
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'Desko.apk');
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const toggleGuide = (guide) => setActiveGuide((prev) => (prev === guide ? null : guide));

  /* ── کلاس مشترک کارت‌ها ── */
  const cardClass = 'bg-panel border border-edge rounded-2xl p-6 transition-all duration-300';
  const headerClass = 'flex items-center justify-between cursor-pointer';

  const renderGuide = (osKey) => {
    switch (osKey) {
      case 'ios':
        return (
          <div className={cardClass}>
            <div className={headerClass} onClick={() => toggleGuide('ios')}>
              <div className="flex items-center gap-3">
                <FaApple className="w-6 h-6 text-ink-2" />
                <h3 className="text-lg font-semibold text-ink">راهنمای نصب در آیفون (iOS)</h3>
              </div>
              <FiChevronDown
                className={`w-5 h-5 text-ink-3 transition-transform duration-300 ${activeGuide === 'ios' ? 'rotate-180' : ''}`}
              />
            </div>
            {activeGuide === 'ios' && (
              <div className="pt-6 mt-4 border-t border-edge">
                <ul className="space-y-4 text-sm text-ink-2">
                  <li className="flex items-start gap-3">
                    <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۱</span>
                    <p>
                      در نوار پایین مرورگر <strong>Safari</strong>، روی دکمه اشتراک‌گذاری{' '}
                      <MdIosShare className="inline text-blue-400 w-5 h-5 mx-1 mb-1" /> کلیک کنید.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۲</span>
                    <p>
                      منو را کمی به پایین بکشید و گزینه <strong>Add to Home Screen</strong>{' '}
                      <FiPlusSquare className="inline text-ink-2 w-4 h-4 mx-1" /> را انتخاب کنید.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۳</span>
                    <p>
                      در صفحه باز شده، روی کلمه <strong>Add</strong> در بالا سمت راست کلیک کنید.
                    </p>
                  </li>
                </ul>
              </div>
            )}
          </div>
        );

      case 'android':
        return (
          <div className={cardClass}>
            <div className={headerClass} onClick={() => toggleGuide('android')}>
              <div className="flex items-center gap-3">
                <FaAndroid className="w-6 h-6 text-brand" />
                <h3 className="text-lg font-semibold text-ink">راهنمای نصب در اندروید</h3>
              </div>
              <FiChevronDown
                className={`w-5 h-5 text-ink-3 transition-transform duration-300 ${activeGuide === 'android' ? 'rotate-180' : ''}`}
              />
            </div>
            {activeGuide === 'android' && (
              <div className="pt-6 mt-4 border-t border-edge">
                <div className="space-y-4">
                  <p className="text-sm text-ink-2 leading-relaxed">
                    با لمس دکمه زیر، فایل نصب اندروید (<strong>Desko.apk</strong>) از سرور دانلود می‌شود؛ سپس آن را
                    باز کنید و اجازه نصب از منابع ناشناس را در صورت نیاز بدهید.
                  </p>
                  <button
                    type="button"
                    onClick={handleAndroidDownloadApk}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600
                               hover:from-emerald-700 hover:to-teal-700 text-white font-medium
                               py-3 rounded-xl transition-all shadow-lg"
                  >
                    نصب اپلیکیشن
                  </button>
                  {deferredPrompt && (
                    <p className="text-xs text-ink-3 leading-relaxed">
                      در صورت تمایل به نسخه وب‌اپ (PWA) می‌توانید از نصب مرورگر هم استفاده کنید.
                      <button
                        type="button"
                        onClick={() => promptInstall()}
                        className="text-brand font-semibold mr-1 underline underline-offset-2"
                      >
                        نصب از مرورگر
                      </button>
                    </p>
                  )}
                  {!deferredPrompt && (
                    <p className="text-sm text-ink-3 leading-relaxed">
                      جایگزین: از منوی مرورگر <BsThreeDotsVertical className="inline text-ink-2 mx-1" /> گزینه{' '}
                      <strong>Install App</strong> یا <strong>Add to Home screen</strong> را انتخاب کنید.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'windows':
        return (
          <div className={cardClass}>
            <div className={headerClass} onClick={() => toggleGuide('windows')}>
              <div className="flex items-center gap-3">
                <FaWindows className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-ink">راهنمای نصب در ویندوز</h3>
              </div>
              <FiChevronDown
                className={`w-5 h-5 text-ink-3 transition-transform duration-300 ${activeGuide === 'windows' ? 'rotate-180' : ''}`}
              />
            </div>
            {activeGuide === 'windows' && (
              <div className="pt-6 mt-4 border-t border-edge">
                {deferredPrompt ? (
                  <div className="space-y-4">
                    <p className="text-sm text-ink-2 leading-relaxed">برای نصب برنامه روی سیستم خود، روی دکمه زیر کلیک کنید:</p>
                    <button
                      type="button"
                      onClick={() => promptInstall()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg"
                    >
                      نصب روی ویندوز
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-4 text-sm text-ink-2">
                    <li className="flex items-start gap-3">
                      <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۱</span>
                      <p>
                        در مرورگر <strong>Chrome</strong> یا <strong>Edge</strong>، به نوار آدرس (بالای صفحه) نگاه کنید.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۲</span>
                      <p>
                        روی آیکون‌نصب <MdGetApp className="inline text-blue-400 w-5 h-5 mx-1" /> (یا نماد مانیتور با فلش) کلیک کنید.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-panel-hover w-6 h-6 rounded-full flex items-center justify-center shrink-0">۳</span>
                      <p>
                        در پنجره باز شده، روی دکمه <strong>Install</strong> کلیک کنید.
                      </p>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const order =
    { ios: ['ios', 'android', 'windows'], android: ['android', 'ios', 'windows'], windows: ['windows', 'android', 'ios'] }[
      detectedOS
    ] || ['android', 'ios', 'windows'];

  return (
    <div className="h-full min-h-0 flex flex-col bg-bg text-ink overflow-hidden">
      <div className="sticky top-0 bg-nav backdrop-blur-xl z-50 border-b border-edge shrink-0 px-4 py-4 flex items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 bg-panel hover:bg-panel-hover rounded-full transition-all flex items-center justify-center"
        >
          <MdArrowForward className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-xl font-bold mr-4 text-brand">نصب اپلیکیشن</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-12">
        <div className="max-w-md mx-auto px-4 mt-8 space-y-8 pb-8">
          <div className="text-center space-y-3">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border shadow-lg"
              style={{
                background: 'var(--t-brand-dim)',
                borderColor: 'var(--t-brand-border)',
                boxShadow: '0 0 30px var(--t-brand-dim)',
              }}
            >
              <MdOutlineInstallMobile className="w-10 h-10 text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-ink">تجربه سریع‌تر و بهتر</h2>
            <p className="text-ink-3 text-sm leading-relaxed">
              با افزودن این برنامه به صفحه اصلی خود، بدون نیاز به مرورگر و با سرعت بسیار بالا به اطلاعات خود دسترسی
              داشته باشید.
            </p>
          </div>

          <div className="space-y-4">
            {order.map((osKey) => (
              <React.Fragment key={osKey}>{renderGuide(osKey)}</React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
