import { formatConsultantNow } from './format';

export const SESSION_STATUSES = [
  { id: 'scheduled', label: 'برنامه‌ریزی شده', tone: 'gray' },
  { id: 'in_progress', label: 'در حال برگزاری', tone: 'blue' },
  { id: 'held', label: 'برگزار شده', tone: 'green' },
  { id: 'cancelled', label: 'لغو شده', tone: 'gray' },
];

export function tehranDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function presentSession(session) {
  const when = session?.starts_at ? new Date(session.starts_at) : null;
  const clock = when && !Number.isNaN(when.getTime()) ? formatConsultantNow(when) : null;
  const meta = SESSION_STATUSES.find((item) => item.id === session?.status) || SESSION_STATUSES[0];
  return {
    id: session.id,
    time: clock?.time || '—',
    name: session.student_name || 'دانش‌آموز',
    topic: session.title,
    title: session.title,
    status: meta.label,
    statusKey: meta.id,
    tone: meta.tone,
    detail: clock ? `${clock.full}، ساعت ${clock.time} · ${meta.label}` : meta.label,
    studentId: session.student_id,
    live: true,
  };
}
