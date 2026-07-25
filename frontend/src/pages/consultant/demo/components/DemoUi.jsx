import { CARD_STYLE } from '../constants/theme';

export { CARD_STYLE };

export function Card({ className = '', children, style }) {
  return (
    <div className={`rounded-3xl p-5 ${className}`} style={{ ...CARD_STYLE, ...style }}>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${className}`}
      style={{ background: '#0EA5E9' }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ message = 'داده‌ای موجود نیست' }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} دقیقه`;
  if (m === 0) return `${h} ساعت`;
  return `${h} ساعت و ${m} دقیقه`;
}

export function formatSeconds(seconds) {
  return formatMinutes(Math.floor((seconds || 0) / 60));
}
