import { useState, useEffect } from 'react';
import { ticketAPI } from '../api/client';

const typeLabel = { consultant: 'مشاوره درسی', support: 'پشتیبانی سایت' };
const typeIcon = { consultant: '📚', support: '🛟' };

const ConsultantFAB = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('consultant');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await ticketAPI.getMyTickets();
      setTickets(res.data);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await ticketAPI.sendTicket({ message, ticket_type: messageType });
      setMessage('');
      // افزودن پیام جدید به لیست و رفتن به تب تاریخچه
      const newTicket = res?.data;
      if (newTicket) {
        setTickets((prev) => [newTicket, ...prev]);
      }
      setShowHistory(true);
      // در صورتی که API داده کامل برنگرداند، لیست را refresh کن
      if (!newTicket) fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'خطا در ارسال پیام. دوباره تلاش کن.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setMessage('');
    setError('');
    setSubmitted(false);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* دکمه شناور */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed fab-safe-bottom left-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r
                   from-purple-600 to-pink-600 rounded-full shadow-2xl shadow-purple-500/50
                   hover:shadow-purple-500/70 flex items-center justify-center
                   text-2xl md:text-3xl z-[60] transition-all duration-300
                   transform hover:scale-110 active:scale-95"
        title="با من حرف بزن"
      >
        💬
      </button>

      {/* مدال اصلی */}
      {showModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[70] px-4"
          style={{ background: 'var(--t-overlay)' }}
        >
          <div className="bg-card rounded-2xl p-6 max-w-lg w-full border border-edge shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* تب‌های بالا */}
            <div className="flex gap-2 mb-5 border-b border-edge pb-4">
              <button
                onClick={() => setShowHistory(false)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  !showHistory ? 'bg-purple-600 text-white' : 'bg-panel text-ink-3 hover:bg-panel-hover'
                }`}
              >
                ✉️ پیام جدید
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  showHistory ? 'bg-purple-600 text-white' : 'bg-panel text-ink-3 hover:bg-panel-hover'
                }`}
              >
                📬 پیام‌های من
              </button>
              <button onClick={handleClose} className="text-ink-3 hover:text-ink text-2xl px-2">×</button>
            </div>

            {/* ===== فرم ارسال پیام ===== */}
            {!showHistory && (
              <>
                {!submitted ? (
                  <>
                    <div className="mb-5">
                      <h2 className="text-2xl font-bold text-ink-2">با من حرف بزن</h2>
                      <p className="text-ink-4 text-sm mt-1">پیامت مستقیم به مدیر یا پشتیبانی می‌رسه</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* نوع پیام */}
                      <div>
                        <label className="block text-ink-3 mb-2 text-sm">در چه موردی می‌خوای بنویسی؟</label>
                        <div className="flex gap-3">
                          {['consultant', 'support'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setMessageType(t)}
                              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                                messageType === t
                                  ? t === 'consultant' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                  : 'bg-panel text-ink-3 hover:bg-panel-hover'
                              }`}
                            >
                              {typeIcon[t]} {typeLabel[t]}
                            </button>
                          ))}
                        </div>
                        <p className="text-ink-4 text-xs mt-2">
                          {messageType === 'consultant'
                            ? '📌 پیام مشاوره درسی برای مدیر مدرسه‌ات فرستاده می‌شه'
                            : '📌 پیام پشتیبانی برای تیم فنی فرستاده می‌شه'}
                        </p>
                      </div>

                      {/* متن پیام */}
                      <div>
                        <label className="block text-ink-3 mb-2 text-sm">متن پیامت</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="هر سوال یا درددلی داری اینجا برام بنویس..."
                          className="w-full px-4 py-3 bg-panel text-ink rounded-lg border border-edge-2
                                     focus:outline-none focus:border-purple-500 resize-none h-32"
                          required
                          autoFocus
                        />
                      </div>

                      {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">{error}</div>
                      )}

                      {/* دکمه‌ها */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex-1 px-6 py-3 bg-panel rounded-lg hover:bg-panel-hover transition font-semibold text-ink"
                        >
                          بی‌خیال
                        </button>
                        <button
                          type="submit"
                          disabled={!message.trim() || submitting}
                          className="flex-1 px-6 py-3 rounded-lg font-semibold transition
                                     bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700
                                     text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? '⏳ در حال ارسال...' : '📤 برام بفرست'}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-7xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-3 text-green-400">پیامت با موفقیت ارسال شد!</h3>
                    <p className="text-ink-3">به زودی جواب می‌گیری. می‌تونی از بخش «پیام‌های من» پیگیری کنی.</p>
                  </div>
                )}
              </>
            )}

            {/* ===== تاریخچه پیام‌ها ===== */}
            {showHistory && (
              <div>
                <h2 className="text-xl font-bold text-ink-2 mb-4">پیام‌های من</h2>
                {loadingHistory ? (
                  <div className="text-center py-10 text-ink-4">در حال بارگذاری...</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-ink-4">هنوز پیامی نفرستادی</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="bg-panel rounded-xl p-4 border border-edge-2">
                        {/* هدر تیکت */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            ticket.ticket_type === 'consultant'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {typeIcon[ticket.ticket_type]} {typeLabel[ticket.ticket_type]}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            ticket.is_resolved
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ticket.is_resolved ? '✅ پاسخ داده شد' : '⏳ در انتظار پاسخ'}
                          </span>
                        </div>

                        {/* متن پیام دانش‌آموز */}
                        <div className="bg-purple-500/10 rounded-lg p-3 mb-2">
                          <p className="text-xs text-ink-4 mb-1">پیام تو — {formatDate(ticket.created_at)}</p>
                          <p className="text-ink text-sm leading-relaxed">{ticket.message}</p>
                        </div>

                        {/* پاسخ */}
                        {ticket.reply ? (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <p className="text-xs text-green-400 mb-1">
                              پاسخ — {formatDate(ticket.replied_at)}
                              {ticket.replied_by_name && ` · ${ticket.replied_by_name}`}
                            </p>
                            <p className="text-ink text-sm leading-relaxed">{ticket.reply}</p>
                          </div>
                        ) : (
                          <div className="text-xs text-ink-4 text-center mt-2">
                            🕐 منتظر پاسخ باش
                          </div>
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
