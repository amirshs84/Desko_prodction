import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { planningAPI, ticketAPI } from '../api/client';

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * دکمه شناور پیام دانش‌آموز:
 * - مشاوره درسی → پیام مستقیم با مشاور مدرسه (Planning)
 * - پشتیبانی سایت → تیکت قدیمی (سوپرادمین)
 */
const ConsultantFAB = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState('consultant'); // consultant | support
  const [error, setError] = useState('');

  // مشاور
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const bottomRef = useRef(null);

  // پشتیبانی
  const [supportText, setSupportText] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportTab, setSupportTab] = useState('compose'); // compose | history

  const selectedConsultant = useMemo(
    () => consultants.find((c) => c.user_id === selectedConsultantId) || null,
    [consultants, selectedConsultantId],
  );

  const thread = useMemo(
    () => messages.filter((m) => m.consultant_id === selectedConsultantId),
    [messages, selectedConsultantId],
  );

  const loadConsultantData = async () => {
    setLoadingChat(true);
    setError('');
    try {
      const [consRes, msgRes] = await Promise.all([
        planningAPI.getMyConsultants(),
        planningAPI.getMyMessages(),
      ]);
      const list = consRes.data || [];
      const inbox = msgRes.data || [];
      setConsultants(list);
      setMessages(inbox);
      setSelectedConsultantId((prev) => {
        if (prev && list.some((c) => c.user_id === prev)) return prev;
        // مشاوری که آخرین پیام را دارد اولویت دارد
        for (let i = inbox.length - 1; i >= 0; i -= 1) {
          const id = inbox[i].consultant_id;
          if (list.some((c) => c.user_id === id)) return id;
        }
        return list[0]?.user_id ?? null;
      });
    } catch (err) {
      setError(
        err?.response?.data?.error?.message
        || 'خطا در بارگذاری گفت‌وگو با مشاور',
      );
    } finally {
      setLoadingChat(false);
    }
  };

  const loadSupportHistory = async () => {
    setLoadingSupport(true);
    try {
      const res = await ticketAPI.getMyTickets();
      setSupportTickets((res.data || []).filter((t) => t.ticket_type === 'support'));
    } catch {
      // silent
    } finally {
      setLoadingSupport(false);
    }
  };

  // deep link نوتیف پیام مشاور: ?chat=consultant&consultant_id=<id>
  useEffect(() => {
    if (searchParams.get('chat') !== 'consultant') return;
    const consultantId = Number(searchParams.get('consultant_id'));
    setChannel('consultant');
    if (consultantId) setSelectedConsultantId(consultantId);
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('chat');
    next.delete('consultant_id');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!open) return undefined;
    if (channel === 'consultant') {
      loadConsultantData();
      const timer = window.setInterval(loadConsultantData, 10_000);
      return () => window.clearInterval(timer);
    }
    loadSupportHistory();
    return undefined;
  }, [open, channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length, open, channel]);

  const handleClose = () => {
    setOpen(false);
    setError('');
    setChatText('');
    setSupportText('');
  };

  const sendChat = async (e) => {
    e.preventDefault();
    const body = chatText.trim();
    if (!body || !selectedConsultantId) return;
    setSendingChat(true);
    setError('');
    try {
      const res = await planningAPI.sendMessageToConsultant({
        consultant_id: selectedConsultantId,
        body,
      });
      setChatText('');
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      } else {
        await loadConsultantData();
      }
    } catch (err) {
      setError(
        err?.response?.data?.error?.message
        || 'خطا در ارسال پیام به مشاور',
      );
    } finally {
      setSendingChat(false);
    }
  };

  const sendSupport = async (e) => {
    e.preventDefault();
    const body = supportText.trim();
    if (!body) return;
    setSendingSupport(true);
    setError('');
    try {
      await ticketAPI.sendTicket({ message: body, ticket_type: 'support' });
      setSupportText('');
      setSupportTab('history');
      await loadSupportHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در ارسال پیام پشتیبانی');
    } finally {
      setSendingSupport(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed fab-safe-bottom left-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r
                   from-emerald-500 to-teal-600 rounded-full shadow-2xl shadow-emerald-500/40
                   hover:shadow-emerald-500/60 flex items-center justify-center
                   text-2xl md:text-3xl z-[60] transition-all duration-300
                   transform hover:scale-110 active:scale-95"
        title="پیام به مشاور"
      >
        💬
      </button>

      {open && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[70] px-4"
          style={{ background: 'var(--t-overlay)' }}
        >
          <div className="bg-card rounded-2xl p-4 md:p-6 max-w-lg w-full border border-edge shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex gap-2 mb-4 border-b border-edge pb-3 shrink-0">
              <button
                type="button"
                onClick={() => { setChannel('consultant'); setError(''); }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  channel === 'consultant'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-panel text-ink-3 hover:bg-panel-hover'
                }`}
              >
                مشاور
              </button>
              <button
                type="button"
                onClick={() => { setChannel('support'); setError(''); }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  channel === 'support'
                    ? 'bg-blue-600 text-white'
                    : 'bg-panel text-ink-3 hover:bg-panel-hover'
                }`}
              >
                پشتیبانی
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-ink-3 hover:text-ink text-2xl px-2"
                aria-label="بستن"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-3 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 shrink-0">
                {error}
              </div>
            )}

            {channel === 'consultant' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="mb-3 shrink-0">
                  <h2 className="text-lg font-bold text-ink-2">گفت‌وگو با مشاور</h2>
                  <p className="text-ink-4 text-xs mt-0.5">پیام‌ها مستقیم به مشاور مدرسه‌ات می‌رسد</p>
                </div>

                {consultants.length > 1 && (
                  <select
                    value={selectedConsultantId || ''}
                    onChange={(e) => setSelectedConsultantId(Number(e.target.value))}
                    className="mb-3 w-full rounded-xl border border-edge-2 bg-panel px-3 py-2 text-sm text-ink shrink-0"
                  >
                    {consultants.map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.full_name || c.phone_number}
                      </option>
                    ))}
                  </select>
                )}

                {selectedConsultant && consultants.length === 1 && (
                  <p className="text-xs text-emerald-400 mb-2 shrink-0">
                    مشاور: {selectedConsultant.full_name}
                  </p>
                )}

                <div className="flex-1 min-h-[240px] max-h-[45vh] overflow-y-auto rounded-xl border border-edge-2 bg-panel/40 p-3 space-y-2.5">
                  {loadingChat && (
                    <p className="text-center text-ink-4 text-sm py-10">در حال بارگذاری…</p>
                  )}
                  {!loadingChat && !selectedConsultantId && (
                    <p className="text-center text-ink-4 text-sm py-10">
                      هنوز مشاوری برای مدرسه‌ات تعریف نشده است.
                    </p>
                  )}
                  {!loadingChat && selectedConsultantId && thread.length === 0 && (
                    <p className="text-center text-ink-4 text-sm py-10 leading-relaxed">
                      هنوز پیامی نیست.
                      <br />
                      اولین پیام را برای مشاور بفرست.
                    </p>
                  )}
                  {thread.map((m) => {
                    const mine = m.sender_role === 'student';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? 'bg-emerald-600 text-white'
                              : 'bg-card border border-edge text-ink'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-ink-4'}`}>
                            {formatDate(m.created_at)}
                            {mine ? ' · شما' : ' · مشاور'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={sendChat} className="mt-3 flex gap-2 shrink-0">
                  <textarea
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    rows={2}
                    placeholder="پیامت را بنویس…"
                    disabled={!selectedConsultantId || sendingChat}
                    className="flex-1 resize-none rounded-xl border border-edge-2 bg-panel text-ink
                               px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChat(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!chatText.trim() || !selectedConsultantId || sendingChat}
                    className="px-4 rounded-xl font-semibold text-sm text-white
                               bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {sendingChat ? '…' : 'ارسال'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex gap-2 mb-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSupportTab('compose')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                      supportTab === 'compose' ? 'bg-blue-600 text-white' : 'bg-panel text-ink-3'
                    }`}
                  >
                    پیام جدید
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSupportTab('history'); loadSupportHistory(); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                      supportTab === 'history' ? 'bg-blue-600 text-white' : 'bg-panel text-ink-3'
                    }`}
                  >
                    تاریخچه پشتیبانی
                  </button>
                </div>

                {supportTab === 'compose' ? (
                  <form onSubmit={sendSupport} className="space-y-4">
                    <p className="text-ink-4 text-xs">پیام پشتیبانی برای تیم فنی سایت فرستاده می‌شود.</p>
                    <textarea
                      value={supportText}
                      onChange={(e) => setSupportText(e.target.value)}
                      placeholder="مشکل یا درخواستت را بنویس…"
                      className="w-full px-4 py-3 bg-panel text-ink rounded-lg border border-edge-2
                                 focus:outline-none focus:border-blue-500 resize-none h-32"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!supportText.trim() || sendingSupport}
                      className="w-full py-3 rounded-lg font-semibold text-white
                                 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingSupport ? 'در حال ارسال…' : 'ارسال به پشتیبانی'}
                    </button>
                  </form>
                ) : (
                  <div className="flex-1 min-h-[240px] max-h-[50vh] overflow-y-auto space-y-3">
                    {loadingSupport && (
                      <p className="text-center text-ink-4 text-sm py-10">در حال بارگذاری…</p>
                    )}
                    {!loadingSupport && supportTickets.length === 0 && (
                      <p className="text-center text-ink-4 text-sm py-10">پیام پشتیبانی‌ای ندارید</p>
                    )}
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="bg-panel rounded-xl p-3 border border-edge-2">
                        <div className="bg-blue-500/10 rounded-lg p-3 mb-2">
                          <p className="text-xs text-ink-4 mb-1">شما — {formatDate(ticket.created_at)}</p>
                          <p className="text-ink text-sm">{ticket.message}</p>
                        </div>
                        {ticket.reply ? (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <p className="text-xs text-green-400 mb-1">
                              پاسخ — {formatDate(ticket.replied_at)}
                            </p>
                            <p className="text-ink text-sm">{ticket.reply}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-ink-4 text-center">در انتظار پاسخ</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ConsultantFAB;
