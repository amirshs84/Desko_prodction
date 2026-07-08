import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api/client';

export default function SuperAdminMessages() {
  const [tickets, setTickets] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await superadminAPI.getTickets();
      setTickets(res.data.tickets);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await superadminAPI.replyToTicket(selected.id, replyText);
      setTickets((prev) => prev.map((t) => t.id === res.data.id ? res.data : t));
      setSelected(res.data);
      setReplyText('');
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      alert('خطا در ارسال پاسخ');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filtered = tickets.filter((t) => {
    if (filter === 'unanswered') return !t.reply;
    if (filter === 'answered') return !!t.reply;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">تیکت‌های پشتیبانی</h2>
          <p className="text-gray-500 text-sm mt-1">پیام‌های پشتیبانی از دانش‌آموزان همه مدارس</p>
        </div>
        {unreadCount > 0 && (
          <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-bold text-sm">
            {unreadCount} تیکت بی‌پاسخ
          </span>
        )}
      </div>

      {/* فیلترها */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'همه'], ['unanswered', 'بی‌پاسخ'], ['answered', 'پاسخ داده شده']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === val
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 min-h-[500px]">
        {/* لیست تیکت‌ها */}
        <div className="w-full lg:w-2/5 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-gray-400">در حال بارگذاری...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p>تیکتی یافت نشد</p>
            </div>
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => { setSelected(ticket); setReplyText(''); }}
                className={`w-full text-right p-4 rounded-xl border transition-all ${
                  selected?.id === ticket.id
                    ? 'bg-purple-50 border-purple-400 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600
                                    flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(ticket.student_name || '؟')[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {ticket.student_name || ticket.student_phone}
                      </p>
                      <p className="text-xs text-gray-400">{ticket.student_phone}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    ticket.reply
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {ticket.reply ? '✅ پاسخ داده شد' : '⏳ بی‌پاسخ'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mr-10">{ticket.message}</p>
                <p className="text-xs text-gray-400 mt-1 mr-10">{formatDate(ticket.created_at)}</p>
              </button>
            ))
          )}
        </div>

        {/* پنل مکالمه - دسکتاپ */}
        <div className="hidden lg:flex flex-1 flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
              <span className="text-6xl">🛟</span>
              <p>یک تیکت انتخاب کن تا بتونی پاسخ بدی</p>
            </div>
          ) : (
            <>
              {/* هدر مکالمه */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600
                                  flex items-center justify-center text-white font-bold">
                    {(selected.student_name || '؟')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selected.student_name || selected.student_phone}</p>
                    <p className="text-xs text-gray-500">{selected.student_phone}</p>
                  </div>
                </div>
              </div>

              {/* بدنه مکالمه */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl rounded-tr-none px-4 py-3">
                      <p className="text-gray-800 text-sm leading-relaxed">{selected.message}</p>
                    </div>
                    <p className="text-xs text-gray-400 text-right mt-1">{formatDate(selected.created_at)}</p>
                  </div>
                </div>

                {selected.reply && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-tl-none px-4 py-3">
                        <p className="text-gray-800 text-sm leading-relaxed">{selected.reply}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(selected.replied_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* باکس پاسخ */}
              {!selected.reply ? (
                <form onSubmit={handleReply} className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ پشتیبانی را بنویسید..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none
                               focus:ring-2 focus:ring-purple-500 resize-none h-20 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-5 py-2 bg-purple-600 text-white rounded-xl font-semibold
                               hover:bg-purple-700 transition-all disabled:opacity-50 self-end"
                  >
                    {sending ? '...' : '📤 ارسال'}
                  </button>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-100 bg-green-50 text-center text-sm text-green-700 font-semibold">
                  ✅ پاسخ این تیکت ارسال شده است
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* موبایل: مدال */}
      {selected && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{selected.student_name || selected.student_phone}</p>
                <p className="text-xs text-gray-500">{selected.student_phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-gray-400">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{formatDate(selected.created_at)}</p>
                <p className="text-gray-800 text-sm leading-relaxed">{selected.message}</p>
              </div>
              {selected.reply && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-400 mb-1">پاسخ پشتیبانی — {formatDate(selected.replied_at)}</p>
                  <p className="text-gray-800 text-sm leading-relaxed">{selected.reply}</p>
                </div>
              )}
              {!selected.reply && (
                <form onSubmit={handleReply} className="flex flex-col gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ پشتیبانی را بنویسید..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none
                               focus:ring-2 focus:ring-purple-500 resize-none h-24 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold
                               hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                    {sending ? 'در حال ارسال...' : '📤 ارسال پاسخ'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
