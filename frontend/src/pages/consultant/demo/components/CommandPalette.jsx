import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search, UserRound } from 'lucide-react';
import { useOptionalConsultant } from '../context/ConsultantContext';
import { useConsultantStudents } from '../hooks/useConsultantQueries';
import { openStudentProfile } from '../lib/navigation';
import { STUDIO } from '../tabs/planning/studioTheme';

const CC = STUDIO;
const OPEN_EVENT = 'consultant:open-command-palette';

/** Ctrl/⌘+J — Ctrl+K معمولاً توسط مرورگر برای جستجو گرفته می‌شود. */
function isPaletteHotkey(e) {
  return (e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J');
}

/**
 * پالت فرمان سراسری مشاور — Ctrl/⌘+J
 * از همه تب‌ها و صفحه پروفایل دانش‌آموز در دسترس است.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const consultant = useOptionalConsultant();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { data: students = [], isFetching } = useConsultantStudents();

  useEffect(() => {
    const onKey = (e) => {
      if (isPaletteHotkey(e)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    // capture تا قبل از هندلرهای مرورگر/صفحه گرفته شود
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
      return;
    }
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return students.slice(0, 8);
    return students
      .filter((s) => {
        const name = normalize(s.full_name || '');
        const phone = normalize(s.phone_number || '');
        const grade = normalize(String(s.grade || ''));
        return name.includes(q) || phone.includes(q) || grade.includes(q);
      })
      .slice(0, 12);
  }, [students, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (student) => {
    if (!student?.user_id) return;
    setOpen(false);
    openStudentProfile(navigate, student.user_id, {
      fromTab: consultant?.activeNav || 'dashboard',
    });
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) go(results[active]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="بستن جستجو"
        onClick={() => setOpen(false)}
      />
      <div
        data-command-palette
        role="dialog"
        aria-modal="true"
        aria-label="جستجوی دانش‌آموز"
        className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', border: `1px solid ${CC.border}` }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: `1px solid ${CC.border}` }}
        >
          <Search size={18} color={CC.brand} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="نام، شماره یا پایه دانش‌آموز…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: CC.ink }}
          />
          <kbd
            className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: CC.pageBg, color: CC.muted, border: `1px solid ${CC.border}` }}
          >
            Esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[min(52vh,360px)] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm" style={{ color: CC.muted }}>
              {isFetching ? 'در حال بارگذاری…' : 'نتیجه‌ای پیدا نشد'}
            </li>
          )}
          {results.map((s, idx) => {
            const selected = idx === active;
            return (
              <li key={s.user_id}>
                <button
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors"
                  style={{ background: selected ? CC.brandSoft : 'transparent' }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: selected ? '#fff' : CC.pageBg, color: CC.brand }}
                  >
                    <UserRound size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: CC.ink }}>
                      {s.full_name || s.phone_number || `#${s.user_id}`}
                    </span>
                    <span className="block text-xs mt-0.5 truncate" style={{ color: CC.muted }}>
                      {[s.phone_number, s.grade ? `پایه ${s.grade}` : null, (s.class_names || []).join('، ')]
                        .filter(Boolean)
                        .join(' · ') || 'پروفایل دانش‌آموز'}
                    </span>
                  </span>
                  {selected && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px]" style={{ color: CC.muted }}>
                      <CornerDownLeft size={12} />
                      ورود
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div
          className="px-4 py-2 flex items-center justify-between text-[11px]"
          style={{ borderTop: `1px solid ${CC.border}`, color: CC.muted, background: CC.pageBg }}
        >
          <span>پرش مستقیم به پروفایل</span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>انتخاب</span>
            <Kbd>Enter</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <kbd
      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: '#fff', border: `1px solid ${CC.border}`, color: CC.ink }}
    >
      {children}
    </kbd>
  );
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/** دکمهٔ میانبر برای هدر دسکتاپ */
export function CommandPaletteTrigger({ className = '' }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={`hidden lg:inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-emerald-50 ${className}`}
      style={{ color: CC.muted, border: `1px solid ${CC.border}`, background: '#fff' }}
      title="جستجوی سریع دانش‌آموز (Ctrl+J)"
    >
      <Search size={14} color={CC.brand} />
      <span>جستجو</span>
      <kbd
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: CC.pageBg, border: `1px solid ${CC.border}` }}
      >
        Ctrl J
      </kbd>
    </button>
  );
}
