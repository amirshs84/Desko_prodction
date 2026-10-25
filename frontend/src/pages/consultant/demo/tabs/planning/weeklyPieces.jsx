import { Fragment } from 'react';
import {
  Atom,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  FlaskConical,
  GripVertical,
  Languages,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sigma,
  Zap,
} from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { useSubjectCatalog } from '../../hooks/useConsultantQueries';
import { faNum } from '../../lib/format';
import { PublishSheet } from './planFlow';
import {
  ACTIVITIES,
  EXCEPTION_STUDENTS,
  HOUR_CHIPS,
  INTENSITIES,
  MOVABILITY_HINT,
  PARTS,
  PRIORITY_HINT,
  TEST_CHIPS,
  cellKey,
  formatAmount,
  parseAmount,
  stepAmount,
  subjectTone,
  usePointerDrag,
} from './weeklyPlanModel';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6A49]';

const SUBJECT_ICONS = {
  'زیست‌شناسی': BookOpen,
  'شیمی': FlaskConical,
  'ریاضی': Sigma,
  'فیزیک': Atom,
  'ادبیات': BookMarked,
  'عربی': Languages,
  'زبان انگلیسی': Languages,
  'دین و زندگی': BookMarked,
};

function subjectIcon(name) {
  return SUBJECT_ICONS[name] || BookOpen;
}

export function PlanNotice({ notice }) {
  if (!notice) return null;
  return (
    <p role="status" className="rounded-2xl bg-[#E6F6EC] text-[#0F6A49] text-sm font-bold px-3 py-2">
      {notice}
    </p>
  );
}

export function ModeToggle({ unit, onChange, label }) {
  return (
    <div className="inline-flex rounded-full bg-[#F3F6F4] p-0.5" role="group" aria-label={label || 'واحد درس'}>
      {[{ id: 'test', text: 'تستی' }, { id: 'hour', text: 'ساعتی' }].map((item) => {
        const active = unit === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={`h-8 px-3 rounded-full text-xs font-bold ${FOCUS} ${active ? 'text-white' : 'text-[#5E6E68]'}`}
            style={active ? { background: PANEL.green } : undefined}
          >
            {item.text}
          </button>
        );
      })}
    </div>
  );
}

export function AmountField({ amount, unit, onChange, label }) {
  const commit = (value) => onChange(Math.max(unit === 'hour' ? 0.5 : 10, value || 0));
  return (
    <div className="inline-flex items-center gap-1">
      <span className="text-lg font-extrabold tabular-nums text-[#17352C] min-w-[2.5rem] text-center">
        <input
          aria-label={label || 'مقدار'}
          inputMode="decimal"
          value={faNum(amount)}
          onChange={(event) => onChange(parseAmount(event.target.value))}
          onBlur={() => commit(Number(amount))}
          className={`w-14 bg-transparent text-center outline-none ${FOCUS}`}
        />
      </span>
      <span className="flex flex-col">
        <button
          type="button"
          aria-label="زیاد کردن"
          onClick={() => onChange(stepAmount(amount, unit, 1))}
          className={`h-4 w-5 flex items-center justify-center text-[#7C8B85] ${FOCUS}`}
        >
          <ChevronDown size={14} className="rotate-180" />
        </button>
        <button
          type="button"
          aria-label="کم کردن"
          onClick={() => onChange(stepAmount(amount, unit, -1))}
          className={`h-4 w-5 flex items-center justify-center text-[#7C8B85] ${FOCUS}`}
        >
          <ChevronDown size={14} />
        </button>
      </span>
    </div>
  );
}

export function PlanSelect({ icon: Icon, valueLabel, open, onToggle, options, selected, onSelect, menuLabel }) {
  return (
    <div className={`relative min-w-0 ${open ? 'z-30' : ''}`} data-plan-popover>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
        className={`w-full h-11 px-3 rounded-2xl bg-white border border-[#E5EEE9] flex items-center gap-2 text-sm font-bold text-[#17352C] shadow-sm ${FOCUS}`}
      >
        <Icon size={16} className="shrink-0" color={PANEL.green} />
        <span className="truncate flex-1 text-right">{valueLabel}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#7C8B85] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label={menuLabel} className="absolute z-30 mt-1 w-full min-w-[220px] rounded-2xl bg-white border border-[#E5EEE9] shadow-xl p-1">
          {options.map((option) => {
            const active = option.id === selected;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(option.id)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-sm ${FOCUS} ${active ? 'bg-[#E6F6EC] text-[#0F6A49] font-bold' : 'hover:bg-[#F3F6F4] text-[#17352C]'}`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ExceptionPanel({ open, onToggle, excluded, onToggleStudent }) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${open ? 'z-30' : ''}`} data-plan-popover>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`w-full h-11 px-3 rounded-2xl bg-white border border-[#E5EEE9] text-[13px] font-bold text-[#17352C] shadow-sm inline-flex items-center justify-center gap-1.5 ${FOCUS}`}
      >
        <Plus size={15} color={PANEL.green} />
        <span className="truncate">استثنا کردن/شخصی‌سازی برای یک فرد خاص</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[240px] rounded-2xl bg-white border border-[#E5EEE9] shadow-xl p-3">
          <p className="text-sm font-extrabold text-[#17352C]">استثنا از برنامه گروهی</p>
          <p className="text-[11px] text-[#7C8B85] mt-1 mb-2">این دانش‌آموزان برنامه جدا می‌گیرند و در ارسال گروهی نمی‌آیند.</p>
          <ul className="flex flex-col gap-1">
            {EXCEPTION_STUDENTS.map((name) => (
              <li key={name}>
                <label className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-[#F3F6F4] text-sm cursor-pointer">
                  <span>{name}</span>
                  <input
                    type="checkbox"
                    checked={excluded.includes(name)}
                    onChange={() => onToggleStudent(name)}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function QuickApply({ plan }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[13px] font-bold text-[#17352C]">تنظیم سریع کل دروس:</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <ModeToggle
          unit={plan.quick.unit}
          label="واحد تنظیم سریع"
          onChange={(unit) => plan.setQuick((current) => ({
            unit,
            amount: unit === 'hour' ? 4 : 100,
          }))}
        />
        <AmountField
          amount={plan.quick.amount}
          unit={plan.quick.unit}
          label="مقدار تنظیم سریع"
          onChange={(amount) => plan.setQuick((current) => ({ ...current, amount }))}
        />
        <button
          type="button"
          data-plan-action="apply"
          onClick={plan.applyQuick}
          className={`h-9 px-4 rounded-xl text-white text-sm font-bold ${FOCUS}`}
          style={{ background: PANEL.green }}
        >
          اعمال
        </button>
      </div>
    </div>
  );
}

function DegreeScale({ label, value, min, hints, onChange }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-bold text-[#17352C]">{label}</span>
        <span className="font-bold text-[#0F6A49] truncate">{hints[value - min]}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1" role="group" aria-label={label}>
        {hints.map((hint, index) => {
          const step = min + index;
          const on = step <= value;
          return (
            <button
              key={hint}
              type="button"
              aria-label={`${label}: ${hint}`}
              aria-pressed={step === value}
              onClick={() => onChange(step)}
              className={`h-2.5 rounded-full ${FOCUS}`}
              style={{ background: on ? '#0F6A49' : '#E5EEE9' }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SubjectSettings({ plan }) {
  const { data: catalog } = useSubjectCatalog();
  const profiles = catalog?.subjects || [];
  return (
    <div className="flex flex-col gap-2.5">
      {plan.subjects.map((subject, index) => {
        const tone = subjectTone(subject.name);
        const Icon = subjectIcon(subject.name);
        const chips = subject.unit === 'hour' ? HOUR_CHIPS : TEST_CHIPS;
        const profile = profiles.find((item) => item.name === subject.name);
        const activity = subject.unit === 'test' ? 'test' : (subject.activity || 'study');
        return (
          <article key={subject.id} data-subject-id={subject.id} className="rounded-2xl border border-[#E7EEEA] bg-white p-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
                  style={{ background: tone.bg, color: tone.ink }}
                >
                  <Icon size={16} />
                </span>
                <p className="font-extrabold text-sm text-[#17352C] truncate">
                  {faNum(index + 1)}. {subject.name}
                </p>
              </div>
              <ModeToggle
                unit={subject.unit}
                label={`واحد ${subject.name}`}
                onChange={(unit) => plan.updateSubject(subject.id, {
                  unit,
                  amount: unit === 'hour' ? 4.5 : 60,
                  activity: unit === 'test' ? 'test' : (subject.activity === 'test' ? 'study' : subject.activity || 'study'),
                })}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AmountField
                  amount={subject.amount}
                  unit={subject.unit}
                  label={`مقدار ${subject.name}`}
                  onChange={(amount) => plan.updateSubject(subject.id, { amount })}
                />
                <span className="text-[11px] text-[#7C8B85]">
                  {subject.unit === 'hour' ? 'ساعت در هفته' : 'تست در هفته'}
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => plan.applyChip(subject.id, value)}
                  className={`h-7 px-2.5 rounded-full bg-[#F3F6F4] text-[11px] font-bold text-[#0F6A49] ${FOCUS}`}
                >
                  {subject.unit === 'hour' ? `${faNum(value)}س` : `+${faNum(value)}`}
                </button>
              ))}
            </div>
            <div className="mt-3" role="group" aria-label={`نوع فعالیت ${subject.name}`}>
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITIES.map((item) => {
                  const active = activity === item.id;
                  const locked = subject.unit === 'test' && item.id !== 'test';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      disabled={locked}
                      onClick={() => plan.updateSubject(subject.id, { activity: item.id })}
                      className={`h-7 px-2.5 rounded-full text-[11px] font-bold disabled:opacity-40 ${FOCUS}`}
                      style={{
                        background: active ? '#0F6A49' : '#F3F6F4',
                        color: active ? '#fff' : '#0F6A49',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <DegreeScale
                label="اهمیت"
                value={Number(subject.priority) || 3}
                min={1}
                hints={PRIORITY_HINT}
                onChange={(priority) => plan.updateSubject(subject.id, { priority })}
              />
              <DegreeScale
                label="شناوری"
                value={Number(subject.movability) || 0}
                min={0}
                hints={MOVABILITY_HINT}
                onChange={(movability) => plan.updateSubject(subject.id, { movability })}
              />
            </div>
            {profile && (
              <p className="mt-2 text-[11px] leading-5 text-[#0F6A49]">
                تگ کاتالوگ: {(profile.tags || []).join('، ') || 'بدون تگ'}
                {profile.is_analytical ? ' · تحلیلی (بلوک سنگین)' : ''}
              </p>
            )}
            {plan.subjects.length > 1 && (
              <button
                type="button"
                onClick={() => plan.removeSubject(subject.id)}
                className={`mt-2 text-[11px] font-bold text-[#A33B3B] ${FOCUS}`}
              >
                حذف درس
              </button>
            )}
          </article>
        );
      })}
      <div className="flex gap-2 min-w-0">
        <input
          value={plan.draftName}
          onChange={(event) => plan.setDraftName(event.target.value)}
          placeholder="نام درس"
          aria-label="نام درس جدید"
          className={`flex-1 min-w-0 h-11 rounded-2xl border border-[#E5EEE9] px-3 text-sm ${FOCUS}`}
        />
        <button
          type="button"
          onClick={plan.addNamedSubject}
          className={`h-11 px-3 rounded-2xl text-white text-sm font-bold shrink-0 ${FOCUS}`}
          style={{ background: PANEL.green }}
        >
          افزودن
        </button>
      </div>
      <button
        type="button"
        data-plan-action="add-list"
        onClick={plan.addSubject}
        className={`h-11 rounded-2xl border border-dashed border-[#C5DDD2] text-sm font-bold text-[#0F6A49] ${FOCUS}`}
      >
        + درس پیشنهادی
      </button>
      <div>
        <p className="text-[12px] font-bold text-[#17352C] mb-1.5">فشردگی بلوک</p>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITIES.map((item) => {
            const active = plan.intensity === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => plan.setIntensity(item.id)}
                className={`rounded-2xl px-2 py-2 text-center ${FOCUS}`}
                style={{
                  background: active ? '#E6F6EC' : '#F8FBFA',
                  color: active ? '#0F6A49' : '#17352C',
                  border: `1px solid ${active ? '#B7E0C8' : '#E5EEE9'}`,
                }}
              >
                <span className="block text-[12px] font-extrabold">{item.label}</span>
                <span className="block text-[10px] leading-4 mt-0.5">{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GenerateButton({ plan, className = '' }) {
  return (
    <button
      type="button"
      data-plan-action="generate"
      onClick={plan.generate}
      disabled={plan.busy}
      className={`h-12 w-full rounded-2xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-70 ${FOCUS} ${className}`}
      style={{ background: PANEL.green }}
    >
      <Zap size={16} />
      {plan.busy ? 'در حال چیدمان...' : 'تولید و چیدمان با الگوریتم'}
    </button>
  );
}

function BlockFace({ block, part, onEdit }) {
  const tone = subjectTone(block.subject);
  return (
    <div
      className="relative rounded-2xl px-1 py-1.5 min-h-[78px] h-full flex flex-col border overflow-hidden"
      style={{ background: tone.bg, borderColor: tone.border, color: tone.ink }}
    >
      <span className="inline-flex items-center gap-0.5 text-[9px] text-[#7C8B85] whitespace-nowrap pl-4">
        <Clock size={10} />
        پارت {faNum(part)}
      </span>
      <span className="mt-1 text-[11px] font-extrabold text-center leading-4">{block.subject}</span>
      <button
        type="button"
        data-no-drag
        aria-label={`ویرایش ${block.subject}`}
        onClick={onEdit}
        className={`absolute top-1 left-1 w-5 h-5 rounded-md inline-flex items-center justify-center text-[#5E6E68] hover:bg-white/70 ${FOCUS}`}
      >
        <Pencil size={12} />
      </button>
      <span className="text-[10px] text-center mt-auto text-[#3E524A]">({formatAmount(block.amount, block.unit)})</span>
    </div>
  );
}

function EmptyFace({ part, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full min-h-[78px] h-full rounded-2xl border border-dashed border-[#D5E0DB] bg-[#F8FBFA] text-[#7C8B85] flex flex-col items-center justify-center gap-1 ${FOCUS}`}
    >
      <span className="inline-flex items-center gap-1 text-[10px]">
        <Clock size={11} />
        پارت {faNum(part)}
      </span>
      <span className="inline-flex items-center gap-1 text-[12px] font-bold">
        <Plus size={13} />
        درس
      </span>
    </button>
  );
}

export function CellEditor({ plan }) {
  const key = plan.editingKey || plan.pickingKey;
  if (!key) return null;
  const partText = key.slice(key.lastIndexOf('-') + 1);
  const dayId = key.slice(0, key.lastIndexOf('-'));
  const day = plan.days.find((item) => item.id === dayId);
  const block = plan.cells[key];
  return (
    <div data-plan-popover className="rounded-2xl border border-[#E5EEE9] bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-[#7C8B85] mb-2">
        {day?.label} {day?.sub}، پارت {faNum(partText)}
      </p>
      {plan.editingKey && block ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-[#17352C] flex items-center gap-1">
            درس
            <select
              aria-label="درس این خانه"
              value={block.subject}
              onChange={(event) => {
                const name = event.target.value;
                const subject = plan.subjects.find((item) => item.name === name);
                plan.updateCell(key, {
                  subject: name,
                  unit: subject?.unit || block.unit,
                });
              }}
              className={`h-9 rounded-xl border border-[#E5EEE9] bg-white px-2 text-sm ${FOCUS}`}
            >
              {[...new Set([block.subject, ...plan.subjects.map((subject) => subject.name)])].map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <AmountField
            amount={block.amount}
            unit={block.unit}
            label="مقدار این خانه"
            onChange={(amount) => plan.updateCell(key, { amount })}
          />
          <ModeToggle
            unit={block.unit}
            label="واحد این خانه"
            onChange={(unit) => plan.updateCell(key, {
              unit,
              amount: unit === 'hour' ? 1.5 : 30,
            })}
          />
          <button
            type="button"
            onClick={() => plan.clearCell(key)}
            className={`h-9 px-3 rounded-xl text-xs font-bold text-[#A33B3B] bg-[#FDECEC] ${FOCUS}`}
          >
            حذف از خانه
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {plan.subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => plan.placeCell(key, subject.name)}
              className={`h-8 px-3 rounded-full text-xs font-bold ${FOCUS}`}
              style={{ background: subjectTone(subject.name).bg, color: subjectTone(subject.name).ink }}
            >
              {subject.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanActions({ plan }) {
  return (
    <>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        data-plan-action="add-grid"
        onClick={plan.beginAddToGrid}
        className={`h-10 px-3 rounded-xl bg-white border border-[#E5EEE9] text-sm font-bold text-[#17352C] inline-flex items-center justify-center gap-1 ${FOCUS}`}
      >
        <Plus size={15} />
        افزودن درس
      </button>
      <button
        type="button"
        data-plan-action="reshuffle"
        onClick={plan.reshuffle}
        className={`h-10 px-3 rounded-xl bg-white border border-[#E5EEE9] text-sm font-bold text-[#17352C] inline-flex items-center justify-center gap-1 ${FOCUS}`}
      >
        <RefreshCw size={15} />
        چیدمان مجدد
      </button>
      <button
        type="button"
        data-plan-action="send"
        onClick={() => plan.setPublishOpen(true)}
        className={`h-10 px-3 rounded-xl text-white text-sm font-bold inline-flex items-center justify-center gap-1 ${FOCUS}`}
        style={{ background: PANEL.green }}
      >
        <Send size={15} />
        {plan.publishResult ? 'منتشر شد' : 'انتشار برنامه'}
      </button>
    </div>
    <PublishSheet plan={plan} />
    </>
  );
}

export function PlanHint() {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[#7C8B85]">
      <Lightbulb size={14} className="shrink-0 mt-0.5" color="#E0A106" />
      <span>راهنما: برای جابه‌جایی، کارت هر درس را بکشید (Drag & Drop) یا برای تغییر عدد، مستقیم روی آیکون کلیک کنید.</span>
    </p>
  );
}

function PlanCell({ dayId, part, plan, drag }) {
  const key = cellKey(dayId, part);
  const block = plan.cells[key];
  const selected = plan.editingKey === key || plan.pickingKey === key;
  const over = drag.overKey === key && drag.activeKey !== key;
  return (
    <div
      data-cell={key}
      className={`min-w-0 rounded-2xl ${selected ? 'ring-2 ring-[#0F6A49]' : ''} ${over ? 'ring-2 ring-[#8FCFAB]' : ''}`}
    >
      {block ? (
        <div
          className={`h-full cursor-grab active:cursor-grabbing select-none ${drag.activeKey === key ? 'opacity-60' : ''}`}
          style={{ touchAction: drag.activeKey ? 'none' : 'pan-y' }}
          {...drag.start(key)}
        >
          <BlockFace block={block} part={part} onEdit={() => plan.openEdit(key)} />
        </div>
      ) : (
        <EmptyFace part={part} onPick={() => plan.openPick(key)} />
      )}
    </div>
  );
}

export function DesktopPlanGrid({ plan }) {
  const drag = usePointerDrag(plan.moveCell);
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <PlanActions plan={plan} />
      <CellEditor plan={plan} />
      <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] gap-2 min-w-0">
        <div className="flex items-center justify-center gap-1 text-[12px] font-bold text-[#7C8B85]">
          <CalendarDays size={14} />
          روز هفته
        </div>
        {PARTS.map((part) => (
          <div key={part} className="flex items-center justify-center gap-1 text-[12px] font-bold text-[#7C8B85]">
            <Clock size={13} />
            پارت {faNum(part)}
          </div>
        ))}
        {plan.days.map((day) => {
          const dayId = day.id;
          return (
            <Fragment key={dayId}>
              <div className="flex flex-col items-center justify-center text-center leading-4">
                <span className="text-[12px] font-extrabold text-[#17352C]">{day.label}</span>
                <span className="text-[10px] font-bold text-[#7C8B85]">{day.sub}</span>
              </div>
              {PARTS.map((part) => (
                <PlanCell key={cellKey(dayId, part)} dayId={dayId} part={part} plan={plan} drag={drag} />
              ))}
            </Fragment>
          );
        })}
      </div>
      <PlanHint />
    </div>
  );
}

export function MobilePlanGrid({ plan }) {
  const drag = usePointerDrag(plan.moveCell);
  const rowDrag = usePointerDrag(plan.reorderDays, { attr: 'data-day', ignoreInteractive: false });
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <PlanActions plan={plan} />
      <CellEditor plan={plan} />
      <div className="overflow-x-auto">
      <div className="min-w-0 w-full flex flex-col gap-3">
        {plan.days.map((day) => {
          const dayId = day.id;
          return (
            <div
              key={dayId}
              data-day={dayId}
              className={`grid items-stretch gap-1.5 min-w-0 ${rowDrag.overKey === dayId ? 'ring-2 ring-[#8FCFAB] rounded-2xl' : ''}`}
              style={{ gridTemplateColumns: '3.2rem repeat(3, minmax(0, 1fr)) 1.2rem' }}
            >
              <div className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold text-[#0F6A49]">
                <CalendarDays size={14} />
                <span className="text-center leading-4">{day.label}</span>
                <span className="text-[10px] text-[#7C8B85]">{day.sub}</span>
              </div>
              {PARTS.map((part) => (
                <PlanCell key={cellKey(dayId, part)} dayId={dayId} part={part} plan={plan} drag={drag} />
              ))}
              <button
                type="button"
                aria-label={`جابه‌جایی ردیف ${day.label}`}
                className={`flex items-center justify-center text-[#B7C4BE] ${FOCUS}`}
                {...rowDrag.start(dayId)}
              >
                <GripVertical size={16} />
              </button>
            </div>
          );
        })}
      </div>
      </div>
      <PlanHint />
    </div>
  );
}

