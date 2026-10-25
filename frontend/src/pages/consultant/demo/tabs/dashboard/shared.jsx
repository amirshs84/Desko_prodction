import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { PANEL } from '../../constants/theme';

export const TONES = {
  green: { bg: '#E6F6EC', fg: '#127A45' },
  blue: { bg: '#E8F1FC', fg: '#3B82F6' },
  coral: { bg: '#FDECEA', fg: '#E25B4A' },
  peach: { bg: '#FFF1E6', fg: '#E07A2F' },
  purple: { bg: '#F3EEFB', fg: '#7C5CBF' },
  amber: { bg: '#FFF4E0', fg: '#C47E0A' },
  red: { bg: '#FDECEC', fg: '#E11D48' },
  gray: { bg: '#F1F3F2', fg: '#6B7280' },
};

export function Surface({ id, className = '', children, style }) {
  return (
    <section
      id={id}
      className={`rounded-[28px] bg-white scroll-mt-24 ${className}`}
      style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}`, ...style }}
    >
      {children}
    </section>
  );
}

export function ToneBadge({ tone = 'gray', children, className = '' }) {
  const palette = TONES[tone] || TONES.gray;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${className}`}
      style={{ background: palette.bg, color: palette.fg }}
    >
      {children}
    </span>
  );
}

export function QuickComposer({ target, onClose, aboveNav = false }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!text.trim()) return;
    setSent(true);
  };

  return (
    <div
      className={`fixed inset-x-0 z-[60] px-4 ${
        aboveNav ? 'bottom-[calc(4.7rem+env(safe-area-inset-bottom))]' : 'bottom-4'
      }`}
    >
      <form
        className="max-w-3xl mx-auto rounded-3xl bg-white p-3.5 shadow-2xl"
        style={{ border: `1px solid ${PANEL.line}` }}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-bold" style={{ color: PANEL.ink }}>
            پیام سریع به {target}
          </p>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-[#7C8B85]" aria-label="بستن">
            <X size={16} />
          </button>
        </div>
        {sent ? (
          <p className="text-sm py-3" style={{ color: PANEL.greenText }} role="status">
            پیام برای {target} ثبت شد.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="متن پیام را بنویسید…"
              className="flex-1 min-w-0 h-11 rounded-2xl px-3 text-sm outline-none"
              style={{ background: PANEL.page, color: PANEL.ink }}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="h-11 px-4 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: PANEL.green }}
            >
              <Send size={14} />
              ارسال
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
