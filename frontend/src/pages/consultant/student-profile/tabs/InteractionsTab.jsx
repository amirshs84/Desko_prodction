import { useEffect, useRef, useState } from 'react';
import { Lock, Send, Trash2 } from 'lucide-react';
import { Card, EmptyState, PrimaryButton } from '../../demo/components/DemoUi';
import {
  useStudentMessages,
  useStudentMessageMutations,
  useStudentNotes,
  useStudentNoteMutations,
} from '../../demo/hooks/useConsultantQueries';
import { PROFILE } from '../profileTheme';

export function InteractionsTab({ userId, composeNonce = 0 }) {
  return (
    <div className="px-4 md:px-8 py-6 pb-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5 h-full min-h-0">
      <div className="lg:col-span-3 min-h-[420px] flex flex-col">
        <MessagesPanel userId={userId} composeNonce={composeNonce} />
      </div>
      <div className="lg:col-span-2 min-h-0">
        <NotesPanel userId={userId} />
      </div>
    </div>
  );
}

function MessagesPanel({ userId, composeNonce }) {
  const { data: messages = [], isLoading, isError, error, refetch } = useStudentMessages(userId);
  const { sendMessage } = useStudentMessageMutations(userId);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (composeNonce > 0) {
      inputRef.current?.focus();
    }
  }, [composeNonce]);

  const onSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSendError('');
    try {
      await sendMessage.mutateAsync({ body });
      setText('');
    } catch (err) {
      setSendError(err?.response?.data?.error?.message || 'خطا در ارسال پیام');
    }
  };

  return (
    <Card className="!p-0 flex flex-col h-full min-h-[420px] overflow-hidden">
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: PROFILE.border }}
      >
        <div>
          <h3 className="font-bold text-sm text-gray-900">پیام‌ها</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">گفت‌وگوی مستقیم با این دانش‌آموز</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-[#F8FBF9]">
        {isLoading && <EmptyState message="در حال بارگذاری پیام‌ها…" />}
        {isError && (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-red-500 mb-2">
              {error?.response?.data?.error?.message || 'خطا در دریافت پیام‌ها'}
            </p>
            {error?.response?.status === 500 && (
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                اگر تازه این قابلیت اضافه شده، مایگریشن دیتابیس را اجرا کنید:
                {' '}
                <span dir="ltr" className="font-mono">migrate Planning</span>
              </p>
            )}
            <PrimaryButton onClick={() => refetch()} style={{ background: PROFILE.brand }}>
              تلاش دوباره
            </PrimaryButton>
          </div>
        )}
        {!isLoading && !isError && messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center leading-relaxed px-6">
              هنوز پیامی رد و بدل نشده.
              <br />
              اولین پیام را از اینجا بفرستید.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === 'consultant';
          return (
            <div
              key={m.id}
              className={`flex ${mine ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm"
                style={{
                  background: mine ? PROFILE.brand : '#fff',
                  color: mine ? '#fff' : PROFILE.ink,
                  border: mine ? 'none' : `1px solid ${PROFILE.border}`,
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                <p
                  className="text-[10px] mt-1.5"
                  style={{ color: mine ? 'rgba(255,255,255,0.75)' : PROFILE.inkSoft }}
                >
                  {m.created_at
                    ? new Date(m.created_at).toLocaleString('fa-IR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                  {mine ? ' · شما' : ' · دانش‌آموز'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="border-t p-3 flex gap-2 items-end"
        style={{ borderColor: PROFILE.border, background: PROFILE.surface }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="پیام خود را بنویسید…"
          className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none
                     focus:ring-2 focus:ring-emerald-200"
          style={{ borderColor: PROFILE.border }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={sendMessage.isPending || !text.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: PROFILE.brand }}
          aria-label="ارسال پیام"
        >
          <Send size={18} />
        </button>
      </form>
      {sendError && <p className="px-3 pb-3 text-xs text-red-600">{sendError}</p>}
    </Card>
  );
}

function NotesPanel({ userId }) {
  const { data: notes = [], isLoading } = useStudentNotes(userId);
  const { createNote, updateNote, deleteNote } = useStudentNoteMutations(userId);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [error, setError] = useState('');

  const onCreate = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setError('');
    try {
      await createNote.mutateAsync({ body: draft.trim() });
      setDraft('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ذخیره یادداشت');
    }
  };

  const onSaveEdit = async (noteId) => {
    setError('');
    try {
      await updateNote.mutateAsync({ noteId, body: editBody.trim() });
      setEditingId(null);
      setEditBody('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ویرایش');
    }
  };

  const onDelete = async (noteId) => {
    if (!window.confirm('این یادداشت حذف شود؟')) return;
    try {
      await deleteNote.mutateAsync(noteId);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در حذف');
    }
  };

  return (
    <Card className="!p-0 overflow-hidden flex flex-col h-full min-h-[420px]">
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: PROFILE.border, background: PROFILE.brandSoft }}
      >
        <div className="flex items-center gap-2">
          <Lock size={14} style={{ color: PROFILE.brandStrong }} />
          <h3 className="font-bold text-sm" style={{ color: PROFILE.brandStrong }}>
            یادداشت‌های خصوصی
          </h3>
        </div>
        <p className="text-[11px] mt-1" style={{ color: PROFILE.inkMuted }}>
          فقط برای شما — دانش‌آموز این بخش را نمی‌بیند
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && <p className="text-xs text-gray-400 py-4 text-center">در حال بارگذاری…</p>}
        {!isLoading && notes.length === 0 && (
          <p className="text-xs text-gray-400 py-6 text-center leading-relaxed">
            هنوز یادداشتی ثبت نکرده‌اید.
          </p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border p-3"
            style={{ borderColor: PROFILE.border, background: '#fff' }}
          >
            {editingId === n.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{ borderColor: PROFILE.border }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveEdit(n.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: PROFILE.brand }}
                  >
                    ذخیره تغییرات
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditBody(''); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-[10px] text-gray-400">
                    {n.updated_at
                      ? new Date(n.updated_at).toLocaleString('fa-IR')
                      : ''}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-[11px] font-semibold"
                      style={{ color: PROFILE.brand }}
                      onClick={() => { setEditingId(n.id); setEditBody(n.body); }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-red-500 inline-flex items-center gap-0.5"
                      onClick={() => onDelete(n.id)}
                    >
                      <Trash2 size={12} />
                      حذف
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={onCreate} className="border-t p-3 flex flex-col gap-2" style={{ borderColor: PROFILE.border }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="یادداشت جدید درباره ویژگی‌های درسی یا روان‌شناختی…"
          className="w-full resize-none rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: PROFILE.border }}
        />
        <button
          type="submit"
          disabled={createNote.isPending || !draft.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: PROFILE.brand }}
        >
          {createNote.isPending ? '…' : 'ذخیره یادداشت'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </Card>
  );
}
