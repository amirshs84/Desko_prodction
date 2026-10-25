import { useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';
import { useGroupMutations } from '../../hooks/useConsultantQueries';
import { GRADE_OPTIONS, PERIODS } from './rosterUtils';

const FIELD = 'h-11 w-full min-w-0 rounded-2xl bg-white px-3 text-[13px] outline-none';

export function AdvancedSearch({ board }) {
  return (
    <section
      className="rounded-[22px] bg-white p-3 flex flex-col gap-3 min-w-0"
      style={{ boxShadow: PANEL.shadow, border: `1px solid ${PANEL.line}` }}
    >
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIODS.map((item) => {
          const active = board.period === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => board.setPeriod(item.id)}
              className="h-9 px-3 rounded-full text-[12.5px] font-bold whitespace-nowrap shrink-0"
              style={{
                background: active ? PANEL.green : PANEL.greenSoft,
                color: active ? '#fff' : PANEL.greenText,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 min-w-0">
        <label className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2" color={PANEL.muted} />
          <input
            value={board.search}
            onChange={(event) => board.setSearch(event.target.value)}
            placeholder="جست‌وجوی نام یا موبایل"
            aria-label="جست‌وجوی نام یا موبایل"
            className={`${FIELD} pr-9`}
            style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
          />
        </label>
        <select
          value={board.grade}
          onChange={(event) => board.setGrade(event.target.value)}
          aria-label="پایه تحصیلی"
          className={FIELD}
          style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
        >
          <option value="">همه پایه‌ها</option>
          {GRADE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          value={board.tag}
          onChange={(event) => board.setTag(event.target.value)}
          placeholder="برچسب (مثل #کنکوری)"
          aria-label="برچسب"
          className={FIELD}
          style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
        />
        <input
          type="number"
          min={0}
          step={1}
          value={board.minHours}
          onChange={(event) => board.setMinHours(event.target.value)}
          placeholder="حداقل ساعت مطالعه"
          aria-label="حداقل ساعت مطالعه"
          className={FIELD}
          style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
        />
      </div>

      <p className="text-[11px] leading-5" style={{ color: PANEL.muted }}>
        مثال فیلتر ترکیبی: برچسب <span className="font-bold">#کنکوری</span>
        {' '}و حداقل ساعت مطالعه <span className="font-bold">۲۰</span> در نمای {board.periodLabel}
      </p>

      <div className="flex items-center justify-between gap-2 min-w-0">
        <button
          type="button"
          onClick={board.toggleAll}
          className="text-[12px] font-bold shrink-0"
          style={{ color: PANEL.greenText }}
        >
          {board.allSelected ? 'لغو انتخاب' : 'انتخاب همه'}
        </button>
        <span className="text-[11px] truncate" style={{ color: PANEL.muted }}>
          {faNum(board.students.length)} دانش‌آموز · {board.periodLabel}
        </span>
      </div>

      {board.failed ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2" style={{ background: '#FDECEC' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#E25B4A' }}>{board.errorMessage}</p>
          <button type="button" onClick={() => board.refetch()} className="text-[12px] font-bold shrink-0" style={{ color: '#E25B4A' }}>
            تلاش دوباره
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function SelectMark({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="w-4 h-4 rounded accent-[#0F6A49] shrink-0"
    />
  );
}

export function StudentFacts({ student, showColumn }) {
  const showTags = showColumn('tags') && student.tags.length > 0;
  const showGroups = showColumn('groups') && student.memberships.length > 0;
  const metrics = student.live
    ? [
      showColumn('study_seconds') ? ['مطالعه', student.studyLabel] : null,
      showColumn('session_count') ? ['جلسات', student.sessionsLabel] : null,
      showColumn('test_count') ? ['تست', student.testsLabel] : null,
      showColumn('last_exam_status') ? ['آزمون', student.examLabel] : null,
    ].filter(Boolean)
    : [];
  if (!showTags && !showGroups && metrics.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-col gap-2 min-w-0">
      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl px-2 py-1.5 min-w-0" style={{ background: '#F6F8F7' }}>
              <p className="text-[10px] truncate" style={{ color: PANEL.muted }}>{label}</p>
              <p className="text-[12.5px] font-extrabold truncate" style={{ color: PANEL.ink }}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {showTags ? <ChipRow items={student.tags} tone="green" /> : null}
      {showGroups ? <ChipRow items={student.memberships} tone="muted" /> : null}
    </div>
  );
}

function ChipRow({ items, tone }) {
  const green = tone === 'green';
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md max-w-full truncate"
          style={{
            background: green ? PANEL.greenSoft : '#F3F4F6',
            color: green ? PANEL.greenText : PANEL.muted,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function BulkActionBar({ board, dock = 'mobile' }) {
  if (board.selectedStudents.length === 0) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white max-w-[calc(100vw-1.5rem)]"
      style={{
        bottom: dock === 'desktop' ? '1.5rem' : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
        border: `1px solid ${PANEL.line}`,
        boxShadow: '0 12px 40px rgba(15,106,73,0.16)',
      }}
    >
      <button
        type="button"
        onClick={board.clearSelected}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#F3F4F6', color: PANEL.muted }}
        aria-label="لغو انتخاب"
      >
        <X size={16} />
      </button>
      <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: PANEL.ink }}>
        {faNum(board.selectedStudents.length)} نفر انتخاب شده
      </span>
      <button
        type="button"
        onClick={board.openCreate}
        className="h-10 px-3 rounded-xl text-[12.5px] font-bold text-white inline-flex items-center gap-1.5 shrink-0"
        style={{ background: PANEL.green }}
      >
        <Users size={15} />
        ایجاد گروه جدید
      </button>
    </div>
  );
}

export function CreateGroupModal({ board }) {
  const { createGroup } = useGroupMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  if (!board.showCreate) return null;

  const members = board.selectedStudents;
  const preview = members.map((student) => student.name).slice(0, 6);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        member_ids: members.map((student) => student.userId),
      });
      board.closeCreate();
      board.clearSelected();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ایجاد گروه');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ background: 'rgba(23,53,44,0.45)' }}>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-[24px] p-5 w-full max-w-md shadow-2xl flex flex-col gap-3"
      >
        <h3 className="text-[18px] font-extrabold" style={{ color: PANEL.ink }}>ایجاد گروه جدید</h3>
        <p className="text-[12px] leading-6" style={{ color: PANEL.muted }}>
          {faNum(members.length)} عضو: {preview.join('، ')}{members.length > preview.length ? ' و …' : ''}
        </p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="نام گروه"
          aria-label="نام گروه"
          required
          className={FIELD}
          style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
          autoFocus
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="توضیحات (اختیاری)"
          aria-label="توضیحات گروه"
          rows={2}
          className="w-full rounded-2xl px-3 py-2.5 text-[13px] resize-none outline-none"
          style={{ border: `1px solid ${PANEL.line}`, color: PANEL.ink }}
        />
        {error ? <p className="text-[12px] font-semibold" style={{ color: '#E25B4A' }}>{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={board.closeCreate}
            className="flex-1 h-11 rounded-2xl text-[13px] font-bold"
            style={{ background: '#F3F4F6', color: PANEL.ink }}
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={createGroup.isPending || !name.trim()}
            className="flex-1 h-11 rounded-2xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: PANEL.green }}
          >
            {createGroup.isPending ? '…' : 'ذخیره گروه'}
          </button>
        </div>
      </form>
    </div>
  );
}
