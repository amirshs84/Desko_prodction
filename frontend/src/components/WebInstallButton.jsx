import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { usePWA } from '../hooks/PWAContext';

const GLASS_CLASS =
  'rounded-xl px-3 py-2 flex items-center gap-1.5 transition-all active:scale-95 ' +
  'bg-white/12 backdrop-blur-md border border-white/25 text-white/95 ' +
  'hover:bg-white/18 hover:border-white/35 ' +
  'shadow-[0_2px_14px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.25)]';

const CTA_CLASS =
  'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ' +
  'bg-gradient-to-r from-sky-500 to-indigo-500 text-white ' +
  'hover:from-sky-600 hover:to-indigo-600 ' +
  'shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]';

const DownloadIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2
         M7 10l5 5 5-5
         M12 15V3" />
  </svg>
);

/** دکمه نصب اپ — در مرورگر وب؛ در native / PWA نصب‌شده دیده نمی‌شود. */
export default function WebInstallButton({
  placeholder = false,
  variant = 'glass',
  hideWhenStandalone = true,
}) {
  const navigate = useNavigate();
  const pwa = usePWA() || {};
  const isStandalone = Boolean(pwa.isStandalone);
  const isNative = Capacitor.isNativePlatform();

  if (isNative || (hideWhenStandalone && isStandalone)) {
    return placeholder ? <div className="h-9" /> : null;
  }

  const isCta = variant === 'cta';

  return (
    <button
      type="button"
      onClick={() => navigate('/install-app')}
      className={isCta ? CTA_CLASS : GLASS_CLASS}
      aria-label="نصب اپلیکیشن"
      title="نصب اپلیکیشن"
    >
      <DownloadIcon className={isCta ? 'w-5 h-5 shrink-0' : 'w-5 h-5 shrink-0 text-white'} />
      <span className={isCta ? 'text-sm' : 'text-xs font-semibold whitespace-nowrap text-white/90'}>
        نصب اپلیکیشن
      </span>
    </button>
  );
}
