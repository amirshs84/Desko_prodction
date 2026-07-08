import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const STORAGE_KEY = 'quickNotesList';

/* رنگ‌های accent یادداشت‌ها */
const COLORS = [
  { border: '#facc15', shadow: 'rgba(250,204,21,0.25)',  label: 'زرد' },
  { border: '#a78bfa', shadow: 'rgba(167,139,250,0.25)', label: 'بنفش' },
  { border: '#2dd4bf', shadow: 'rgba(45,212,191,0.25)',  label: 'فیروزه‌ای' },
  { border: '#f472b6', shadow: 'rgba(244,114,182,0.25)', label: 'صورتی' },
  { border: '#60a5fa', shadow: 'rgba(96,165,250,0.25)',  label: 'آبی' },
  { border: '#fb923c', shadow: 'rgba(251,146,60,0.25)',  label: 'نارنجی' },
];

const DEFAULT_NOTE = {
  id: 'default-guide',
  title: 'خوش‌آمدید!',
  text:
    'اینجا می‌تونی یادداشت‌های کوتاه خودت رو ثبت کنی.\n\n' +
    'برای افزودن یادداشت جدید روی دکمه + پایین صفحه کلیک کن.\n' +
    'برای ویرایش یادداشت روی آن کلیک کن.',
  createdAt: new Date().toISOString(),
  colorIndex: 0,
};

const loadNotes = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* silent */ }
  return [DEFAULT_NOTE];
};

const saveToStorage = (notes) => localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

const formatPersianDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

/* ── کارت یادداشت ── */
const NoteCard = ({ note, onEdit, onDelete }) => {
  const color = COLORS[note.colorIndex % COLORS.length];
  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden transition-all
                    duration-200 hover:scale-[1.02] cursor-pointer"
      style={{
        width: '100%', minHeight: '160px',
        background: 'var(--t-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1.5px solid ${color.border}`,
        boxShadow: `0 4px 24px ${color.shadow}, inset 0 0 0 1px var(--t-glass)`,
      }}
      onClick={() => onEdit(note)}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${color.border}, transparent)` }} />

      {/* عنوان */}
      {note.title && (
        <div className="px-4 pt-4 pb-1 flex-shrink-0">
          <p className="text-ink font-semibold text-sm text-right leading-tight line-clamp-1"
            dir="auto">
            {note.title}
          </p>
          <div className="mt-1.5 h-px" style={{ background: `${color.border}40` }} />
        </div>
      )}

      {/* متن */}
      <div className={`flex-1 px-4 ${note.title ? 'pt-2' : 'pt-4'} pb-2 overflow-hidden`}>
        <p className="text-ink-2 text-sm leading-relaxed text-right"
          dir="auto"
          style={{
            display: '-webkit-box', WebkitLineClamp: note.title ? 4 : 5,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
          {note.text || <span className="text-ink-4 italic">بدون متن</span>}
        </p>
      </div>

      {/* پایین کارت */}
      <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
        <span className="text-[11px] text-ink-4 tabular-nums">
          {formatPersianDate(note.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="text-ink-4 hover:text-red-400 p-1.5 rounded-lg hover:bg-panel transition"
            aria-label="حذف">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(note); }}
            className="p-1.5 rounded-lg hover:bg-panel transition" aria-label="ویرایش"
            style={{ color: color.border }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── مدال افزودن/ویرایش یادداشت ── */
const NoteModal = ({ note, onSave, onClose }) => {
  const [title, setTitle] = useState(note?.title ?? '');
  const [text, setText] = useState(note?.text ?? '');
  const [colorIndex, setColorIndex] = useState(
    note?.colorIndex ?? Math.floor(Math.random() * COLORS.length)
  );

  const handleSave = () => {
    const trimmedText = text.trim();
    const trimmedTitle = title.trim();
    if (!trimmedText && !trimmedTitle) return;
    onSave({
      id: note?.id ?? Date.now().toString(),
      title: trimmedTitle,
      text: trimmedText,
      createdAt: note?.createdAt ?? new Date().toISOString(),
      colorIndex,
    });
  };

  const activeColor = COLORS[colorIndex % COLORS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-5"
        style={{
          background: 'var(--t-card)',
          border: `1.5px solid ${activeColor.border}`,
          boxShadow: `0 0 40px ${activeColor.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}>
        {/* handle bar موبایل */}
        <div className="sm:hidden w-10 h-1 bg-panel-hover rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4" dir="rtl">
          <h2 className="text-base font-semibold text-ink-2">
            {note ? 'ویرایش یادداشت' : 'یادداشت جدید'}
          </h2>
          <button onClick={onClose}
            className="text-ink-3 hover:text-ink-2 transition p-1 rounded-lg hover:bg-panel">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* انتخاب رنگ */}
        <div className="flex gap-3 mb-4 justify-end">
          {COLORS.map((c, i) => (
            <button key={i} onClick={() => setColorIndex(i)}
              className="w-5 h-5 rounded-full transition-all duration-150"
              style={{
                background: 'transparent',
                border: `2px solid ${c.border}`,
                transform: colorIndex === i ? 'scale(1.4)' : 'scale(1)',
                boxShadow: colorIndex === i ? `0 0 8px ${c.border}` : 'none',
              }}
              aria-label={c.label} />
          ))}
        </div>

        {/* عنوان */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان (اختیاری)..."
          dir="rtl"
          autoFocus
          className="w-full text-ink font-semibold placeholder-ink-4 rounded-xl px-4 py-2.5
                     text-sm focus:outline-none transition mb-3"
          style={{
            background: 'var(--t-glass)',
            border: `1px solid ${activeColor.border}40`,
          }}
          onFocus={(e) => { e.target.style.borderColor = activeColor.border + '99'; }}
          onBlur={(e)  => { e.target.style.borderColor = activeColor.border + '40'; }}
        />

        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="متن یادداشت..."
          dir="rtl"
          className="w-full h-40 text-ink-2 placeholder-ink-4 rounded-xl p-4 text-sm
                     resize-none focus:outline-none transition leading-relaxed"
          style={{
            background: 'var(--t-glass)',
            border: `1px solid ${activeColor.border}40`,
          }}
          onFocus={(e)  => { e.target.style.borderColor = activeColor.border + '99'; }}
          onBlur={(e)   => { e.target.style.borderColor = activeColor.border + '40'; }} />

        <div className="flex justify-start mt-4">
          <button onClick={handleSave} disabled={!text.trim() && !title.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${activeColor.border}, ${activeColor.border}99)`,
              color: '#000',
              boxShadow: (!text.trim() && !title.trim()) ? 'none' : `0 4px 16px ${activeColor.shadow}`,
            }}>
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── صفحه اصلی ── */
const QuickNotes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(loadNotes);
  const [editingNote, setEditingNote] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const persist = (newNotes) => { setNotes(newNotes); saveToStorage(newNotes); };

  const handleSave = (noteData) => {
    const isExisting = notes.some((n) => n.id === noteData.id);
    persist(isExisting ? notes.map((n) => (n.id === noteData.id ? noteData : n)) : [noteData, ...notes]);
    setEditingNote(null);
    setShowNewModal(false);
  };

  const handleDelete = (id) => persist(notes.filter((n) => n.id !== id));

  return (
    <div className="h-full flex flex-col bg-bg text-ink" dir="rtl">
      {/* هدر ثابت */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 md:px-8 md:pt-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-ink-3 hover:text-ink transition p-2 rounded-xl hover:bg-panel"
            aria-label="بازگشت">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold pb-1" style={{
            background: 'linear-gradient(90deg, #facc15, #fb923c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            یادداشت‌ها
          </h1>
          <span className="text-sm text-ink-4 mr-1 mt-1">{notes.length} یادداشت</span>
        </div>
      </div>

      {/* فقط یادداشت‌ها اسکرول می‌شوند */}
      <div className="flex-1 overflow-y-auto overscroll-none pb-nav-safe">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* حالت خالی */}
          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-ink-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 opacity-30" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-lg">هیچ یادداشتی وجود ندارد</p>
              <p className="text-sm mt-1">با کلیک روی دکمه + اولین یادداشت را بساز</p>
            </div>
          )}

          {/* گرید یادداشت‌ها */}
          {notes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note}
                  onEdit={setEditingNote} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* دکمه شناور افزودن */}
      <button onClick={() => setShowNewModal(true)} aria-label="یادداشت جدید"
        className="fixed fab-safe-bottom left-4 md:left-8 z-40 w-14 h-14 rounded-full flex items-center
                   justify-center transition-transform hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #facc15, #fb923c)',
          boxShadow: '0 6px 28px rgba(250,204,21,0.35)',
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none"
          viewBox="0 0 24 24" stroke="#000" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showNewModal && (
        <NoteModal onSave={handleSave} onClose={() => setShowNewModal(false)} />
      )}
      {editingNote && (
        <NoteModal note={editingNote} onSave={handleSave} onClose={() => setEditingNote(null)} />
      )}

      <BottomNav />
    </div>
  );
};

export default QuickNotes;
