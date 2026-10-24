import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import BottomNav from '../components/BottomNav';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { openExternalUrl } from '../utils/download';
import { API_BASE_URL } from '../api/config';
import { AwakeWindowEditor } from '../calendar/components/AwakeWindowEditor';

/* ── آدرس APK از همان پایه سرور ── */
function buildApkUrl() {
  const envUrl = import.meta.env.VITE_ANDROID_APK_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).trim();
  try {
    return new URL(API_BASE_URL).origin + '/Desko.apk';
  } catch {
    return `${window.location.origin}/Desko.apk`;
  }
}

const ChevronIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-40" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 text-brand animate-spin" xmlns="http://www.w3.org/2000/svg"
    fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function Settings() {
  const navigate = useNavigate();
  const {
    currentVersion, latestVersion, latestData,
    hasUpdate, checking, checked, error, errorDetail,
    checkForUpdate,
  } = useAppUpdate();

  const [showChangelog, setShowChangelog] = useState(false);
  const [awakeOpen, setAwakeOpen] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleDownloadApk = () => openExternalUrl(buildApkUrl());

  return (
    <div className="h-full bg-page text-ink flex flex-col overflow-hidden">

      {/* ── هدر ── */}
      <div className="shrink-0 px-4 pt-6 pb-4 flex items-center gap-3 border-b border-edge">
        <div className="w-8 h-8 rounded-xl bg-panel flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0
                 004.582 9m0 0H9m11 4v5h-.581m0 0a8.003
                 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h1 className="text-lg font-bold">به‌روزرسانی اپلیکیشن</h1>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-nav-safe">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          <section>
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 px-1">
              برنامه‌ریزی
            </h2>
            <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAwakeOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-4
                           hover:bg-panel-hover transition-colors active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                </div>
                <div className="text-right flex-1">
                  <p className="text-sm font-medium text-ink">بازه فعال روزانه</p>
                  <p className="text-xs text-ink-4">ساعت‌هایی که موتور حق برنامه‌دادن دارد — پیش‌فرض ۷ تا ۲۳</p>
                </div>
                <ChevronIcon />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 px-1">
              اعلان‌ها
            </h2>
            <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
              {[
                { to: '/notifications', title: 'صندوق اعلان‌ها', hint: 'پیام‌ها و یادآورهای دریافتی' },
                { to: '/settings/notifications', title: 'تنظیمات اعلان‌ها', hint: 'دسته‌ها، ساعات سکوت، توقف موقت' },
              ].map((item, i) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-panel-hover transition-colors
                              active:scale-[0.98] ${i ? 'border-t border-edge' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
                    </svg>
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-ink-4">{item.hint}</p>
                  </div>
                  <ChevronIcon />
                </button>
              ))}
            </div>
          </section>

          {/* ─── آپدیت برنامه ─── */}
          <section>
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 px-1">
              آپدیت برنامه
            </h2>
            <div className="bg-panel border border-edge rounded-2xl overflow-hidden">

              {/* نسخه فعلی */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-edge">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-ink-2"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">نسخه نصب‌شده</p>
                    <p className="text-xs font-mono text-ink-4">{currentVersion ?? '...'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {checked && !hasUpdate && <CheckIcon />}
                  {hasUpdate && latestVersion && (
                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30
                                     px-2 py-1 rounded-lg font-semibold">
                      v{latestVersion} موجود
                    </span>
                  )}
                </div>
              </div>

              {/* حالت: آپدیت موجود نیست یا هنوز چک نشده */}
              {!hasUpdate && (
                <button
                  onClick={checkForUpdate}
                  disabled={checking}
                  className="w-full flex items-center gap-3 px-4 py-4
                             hover:bg-panel-hover transition-colors
                             disabled:opacity-60 active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center">
                    {checking ? <SpinnerIcon /> : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0
                             004.582 9m0 0H9m11 4v5h-.581m0 0a8.003
                             8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium text-ink">
                      {checking ? 'در حال بررسی...' : 'بررسی آپدیت'}
                    </p>
                    {checked && !hasUpdate && (
                      <p className="text-xs text-emerald-400">اپ شما به‌روز است ✓</p>
                    )}
                    {error && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-red-400">{error}</p>
                        {errorDetail && (
                          <p className="text-[10px] text-red-400/60 font-mono break-all leading-tight">
                            {errorDetail}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* حالت: آپدیت موجود است */}
              {hasUpdate && (
                <div className="p-4 space-y-4">

                  {/* بنر هشدار */}
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30
                                  rounded-xl p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0
                           011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-300">
                        نسخه {latestVersion} آماده نصب است!
                      </p>
                      <p className="text-xs text-ink-3 mt-0.5">
                        نسخه فعلی: {currentVersion}
                      </p>
                    </div>
                  </div>

                  {/* تغییرات نسخه */}
                  {latestData?.changes && latestData.changes.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowChangelog(p => !p)}
                        className="w-full flex items-center justify-between py-2 text-sm
                                   text-ink-2 hover:text-ink transition-colors"
                      >
                        <span className="font-medium">مشاهده تغییرات این نسخه</span>
                        <svg xmlns="http://www.w3.org/2000/svg"
                          className={`w-4 h-4 transition-transform duration-200 ${showChangelog ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showChangelog && (
                        <div className="space-y-3 mt-2">
                          {latestData.changes.map((section, i) => (
                            <div key={i} className="bg-panel-hover rounded-xl p-3">
                              <p className="text-xs font-semibold text-ink-2 mb-2">
                                {section.category}
                              </p>
                              <ul className="space-y-1.5">
                                {section.items.map((item, j) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-ink-3">
                                    <span className="text-brand shrink-0 mt-0.5">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {latestData.releaseDate && (
                            <p className="text-xs text-ink-4 text-center">
                              تاریخ انتشار: {latestData.releaseDate}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* دکمه آپدیت */}
                  {isNative ? (
                    <button
                      onClick={handleDownloadApk}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-600
                                 hover:from-red-600 hover:to-rose-700 text-white font-semibold
                                 py-3.5 rounded-xl transition-all active:scale-[0.98]
                                 shadow-lg shadow-red-500/25
                                 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0
                             011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      دانلود و نصب نسخه {latestVersion}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/install-app')}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-600
                                 hover:from-red-600 hover:to-rose-700 text-white font-semibold
                                 py-3.5 rounded-xl transition-all active:scale-[0.98]"
                    >
                      مشاهده روش نصب / آپدیت
                    </button>
                  )}

                  <button
                    onClick={checkForUpdate}
                    disabled={checking}
                    className="w-full text-xs text-ink-4 hover:text-ink-3
                               transition-colors py-1 disabled:opacity-50"
                  >
                    {checking ? 'در حال بررسی...' : '↺ بررسی مجدد'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ─── نصب اپ (فقط وب) ─── */}
          {!isNative && (
            <section>
              <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 px-1">
                نصب
              </h2>
              <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
                <button
                  onClick={() => navigate('/install-app')}
                  className="w-full flex items-center gap-3 px-4 py-4
                             hover:bg-panel-hover transition-colors active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4
                           4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium text-ink">نصب اپلیکیشن</p>
                    <p className="text-xs text-ink-4">دانلود APK یا نصب PWA</p>
                  </div>
                  <ChevronIcon />
                </button>
              </div>
            </section>
          )}

          {/* ─── درباره ─── */}
          <section>
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 px-1">
              درباره
            </h2>
            <div className="bg-panel border border-edge rounded-2xl overflow-hidden
                            divide-y divide-edge">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-ink-3">نام برنامه</p>
                <p className="text-sm font-medium text-ink">Desko</p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-ink-3">نسخه</p>
                <p className="text-sm font-mono text-ink">{currentVersion ?? '...'}</p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-ink-3">پلتفرم</p>
                <p className="text-sm text-ink">{isNative ? 'Android Native' : 'Web / PWA'}</p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-ink-3">توسعه‌دهنده</p>
                <p className="text-xs font-mono text-ink-4">ir.mindtempo.app</p>
              </div>
            </div>
          </section>

        </div>
      </div>

      <BottomNav />
      <AwakeWindowEditor open={awakeOpen} onClose={() => setAwakeOpen(false)} canEdit />
    </div>
  );
}
