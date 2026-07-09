import { AlertTriangle, Info } from 'lucide-react';
import { CARD_STYLE } from '../constants/theme';

export { CARD_STYLE };

export function DemoCard({ children, className = '' }) {
  return (
    <div className={`rounded-3xl p-5 ${className}`} style={CARD_STYLE}>
      {children}
    </div>
  );
}

export function EmptyDataMessage({ className = 'py-8', message = 'داده‌ای موجود نیست' }) {
  return (
    <p className={`text-sm text-gray-400 text-center ${className}`}>{message}</p>
  );
}

export function CardFooter({ variant = 'info', text }) {
  const isWarning = variant === 'warning';
  return (
    <div
      className="flex items-center gap-2 mt-4 -mx-5 -mb-5 px-5 py-3 rounded-b-3xl"
      style={{ background: isWarning ? '#FEF2F2' : '#F9FAFB' }}
    >
      {isWarning ? (
        <AlertTriangle size={14} color="#EF4444" />
      ) : (
        <Info size={14} color="#9CA3AF" />
      )}
      <span
        className="text-xs font-medium"
        style={{ color: isWarning ? '#EF4444' : '#6B7280' }}
      >
        {text}
      </span>
    </div>
  );
}

export function RankBadge({ rank, color, bg, lightText }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
      style={{ background: bg, color: lightText ? '#fff' : color }}
    >
      {rank}
    </div>
  );
}
