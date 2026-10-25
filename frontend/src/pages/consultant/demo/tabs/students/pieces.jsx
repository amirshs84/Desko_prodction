import { AlertTriangle, Check, ChevronDown, ChevronLeft } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { faNum } from '../../lib/format';

export function ProgressTrack({ percent }) {
  return (
    <div className="h-2 flex-1 rounded-full bg-[#E5F6EC] overflow-hidden" aria-hidden="true">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: '#1F9D5A' }}
      />
    </div>
  );
}

export function StatusPill({ status }) {
  const attention = status === 'attention';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{
        background: attention ? '#FDECEC' : '#E7F8EE',
        color: attention ? '#E25B4A' : '#128A4C',
      }}
    >
      {attention ? <AlertTriangle size={12} /> : <Check size={12} />}
      {attention ? 'نیازمند توجه' : 'فعال'}
    </span>
  );
}

export function DaysAgo({ days, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: PANEL.muted }}>
      {Icon ? <Icon size={13} /> : null}
      {faNum(days)} روز پیش
    </span>
  );
}

export function ExpandToggle({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="w-full h-9 inline-flex items-center justify-center gap-1 text-[12.5px] font-bold"
      style={{ color: PANEL.greenText }}
    >
      جزئیات بیشتر
      <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

export function DetailBlock({ student, onOpen }) {
  return (
    <div className="mt-2 pt-3 flex flex-col gap-2.5 text-[12.5px]" style={{ borderTop: `1px solid ${PANEL.line}` }}>
      <p className="flex items-start justify-between gap-3">
        <span style={{ color: PANEL.muted }}>آخرین جلسه مشاوره</span>
        <span className="font-semibold text-left" style={{ color: PANEL.ink }}>
          {student.lastSession.date}
          <span className="block font-medium" style={{ color: PANEL.muted }}>{student.lastSession.time}</span>
        </span>
      </p>
      <p className="flex items-start justify-between gap-3">
        <span style={{ color: PANEL.muted }}>زمان مشاوره بعدی</span>
        <span className="font-semibold text-left" style={{ color: PANEL.ink }}>
          {student.nextSession.date}
          <span className="block font-medium" style={{ color: PANEL.muted }}>{student.nextSession.time}</span>
        </span>
      </p>
      <div>
        <p className="font-bold mb-1" style={{ color: PANEL.ink }}>توضیحات</p>
        <p className="leading-6" style={{ color: PANEL.muted }}>{student.note}</p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-1 h-11 rounded-2xl text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5"
        style={{ background: PANEL.green }}
      >
        مشاهده کامل
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}
