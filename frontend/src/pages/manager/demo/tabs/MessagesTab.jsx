import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Send, X, MessageSquare } from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import { useManagerTickets } from '../hooks/useManagerTickets';
import {
  GRADE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '../utils/ticketDataTransformers';
import { toPersianDigits } from '../utils/classDataTransformers';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-8 pr-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
      >
        {options.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={12} color="#9CA3AF" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function TicketListItem({ ticket, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(ticket)}
      className="w-full text-right p-4 rounded-2xl transition-all"
      style={{
        ...CARD_STYLE,
        border: selected
          ? '1px solid #6EE7B7'
          : ticket.unread
            ? '1px solid #A7F3D0'
            : CARD_STYLE.border,
        background: selected ? '#ECFDF5' : '#fff',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
          style={{ background: ticket.unread ? '#10B981' : '#9CA3AF' }}
        >
          {ticket.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${ticket.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
              {ticket.from}
            </p>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: ticket.reply ? '#D1FAE5' : '#FEF3C7',
                color: ticket.reply ? '#059669' : '#D97706',
              }}
            >
              {ticket.reply ? 'پاسخ‌داده‌شده' : 'بی‌پاسخ'}
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{ticket.role}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{ticket.preview}</p>
          <p className="text-[10px] text-gray-400 mt-1.5">{ticket.time}</p>
        </div>
      </div>
    </button>
  );
}

function ConversationPanel({ ticket, onClose, onReply, replyLoading, compact }) {
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    setReplyText('');
  }, [ticket?.id]);

  if (!ticket) {
    return (
      <div
        className="rounded-3xl flex-1 flex flex-col items-center justify-center gap-3 min-h-[320px]"
        style={CARD_STYLE}
      >
        <MessageSquare size={40} color="#D1D5DB" />
        <p className="text-sm text-gray-400">یک پیام انتخاب کنید تا پاسخ دهید</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || ticket.reply) return;
    const result = await onReply(ticket.id, replyText.trim());
    if (result.ok) setReplyText('');
    else alert(result.error);
  };

  return (
    <div className="rounded-3xl flex flex-col overflow-hidden min-h-[320px]" style={CARD_STYLE}>
      <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100" style={{ background: '#F9FAFB' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: '#10B981' }}
          >
            {ticket.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{ticket.studentName}</p>
            <p className="text-xs text-gray-500 truncate">
              {ticket.studentPhone}
              {ticket.gradeLabel !== '—' ? ` · پایه ${ticket.gradeLabel}` : ''}
            </p>
          </div>
        </div>
        {compact && (
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={16} color="#6B7280" />
          </button>
        )}
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[360px]">
        <div className="flex justify-end">
          <div className="max-w-[85%]">
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-left">{formatDate(ticket.createdAt)}</p>
          </div>
        </div>

        {ticket.reply && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-tr-sm px-4 py-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.reply}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{formatDate(ticket.repliedAt)}</p>
            </div>
          </div>
        )}
      </div>

      {!ticket.reply ? (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="پاسخ خود را بنویسید..."
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}
          />
          <button
            type="submit"
            disabled={replyLoading || !replyText.trim()}
            className="px-4 py-2.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: '#10B981' }}
          >
            <Send size={14} />
            ارسال
          </button>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
          به این پیام پاسخ داده شده است
        </div>
      )}
    </div>
  );
}

function MessagesBody({ compact }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({ search: debouncedSearch, grade, status }),
    [debouncedSearch, grade, status],
  );

  const {
    tickets,
    markMessageRead,
    replyToTicket,
    replyLoading,
    loading,
    error,
  } = useManagerTickets(filters);

  // در تب پیام‌ها، badge واقعی بی‌پاسخ‌ها را از داده خام نشان بده
  const unansweredCount = useMemo(
    () => tickets.filter((t) => !t.reply).length,
    [tickets],
  );

  useEffect(() => {
    if (!selected) return;
    const updated = tickets.find((t) => t.id === selected.id);
    if (updated) setSelected(updated);
  }, [tickets, selected?.id]);

  const handleSelect = useCallback((ticket) => {
    setSelected(ticket);
    markMessageRead(ticket.id);
  }, [markMessageRead]);

  const spacing = compact ? 'space-y-4' : 'space-y-5';
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={`${padding} ${spacing}`}>
      <div className={`flex ${compact ? 'flex-col gap-3' : 'items-start justify-between gap-4'}`}>
        <div>
          <h1 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>پیام‌ها</h1>
          <p className={`text-gray-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            پیام‌های مشاوره دانش‌آموزان مدرسه
          </p>
        </div>
        {unansweredCount > 0 && (
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-xl self-start"
            style={{ background: '#FEE2E2', color: '#DC2626' }}
          >
            {toPersianDigits(unansweredCount)} پیام بی‌پاسخ
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl text-sm text-red-700" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <div className={`flex ${compact ? 'flex-col gap-2' : 'items-center gap-2 flex-wrap'}`}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm flex-1 min-w-[180px]"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام، شماره یا متن پیام..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <FilterSelect value={grade} onChange={setGrade} options={GRADE_FILTER_OPTIONS} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
      </div>

      {compact && selected ? (
        <ConversationPanel
          ticket={selected}
          onClose={() => setSelected(null)}
          onReply={replyToTicket}
          replyLoading={replyLoading}
          compact
        />
      ) : (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-5'}`}>
          <div className={`${compact ? '' : 'col-span-2'} flex flex-col gap-2 max-h-[560px] overflow-y-auto`}>
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-10">در حال بارگذاری...</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">پیامی یافت نشد</p>
            ) : (
              tickets.map((ticket) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  selected={selected?.id === ticket.id}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
          {!compact && (
            <div className="col-span-3">
              <ConversationPanel
                ticket={selected}
                onClose={() => setSelected(null)}
                onReply={replyToTicket}
                replyLoading={replyLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessagesDesktop() {
  return (
    <DesktopPageShell>
      <MessagesBody />
    </DesktopPageShell>
  );
}

export function MessagesMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <MessagesBody compact />
    </MobilePageShell>
  );
}
