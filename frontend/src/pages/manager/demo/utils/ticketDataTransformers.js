import { timeAgo } from './notificationDataTransformers';

const GRADE_LABELS = {
  '7': 'هفتم',
  '8': 'هشتم',
  '9': 'نهم',
  '10': 'دهم',
  '11': 'یازدهم',
  '12': 'دوازدهم',
  graduate: 'فارغ‌التحصیل',
};

export function getGradeLabel(grade) {
  if (!grade) return '—';
  return GRADE_LABELS[grade] || grade;
}

export function mapApiTicket(ticket) {
  const name = ticket.student_name || ticket.student_phone || '—';
  const gradeLabel = getGradeLabel(ticket.student_grade);
  const unanswered = !ticket.reply;
  return {
    id: ticket.id,
    from: name,
    role: gradeLabel !== '—' ? `پایه ${gradeLabel}` : 'دانش‌آموز',
    preview: (ticket.message || '').slice(0, 100),
    time: timeAgo(ticket.created_at),
    unread: unanswered,
    avatar: (name || '؟')[0],
    studentName: name,
    studentPhone: ticket.student_phone || '',
    studentGrade: ticket.student_grade || '',
    gradeLabel,
    message: ticket.message || '',
    reply: ticket.reply || null,
    repliedAt: ticket.replied_at || null,
    createdAt: ticket.created_at,
    isResolved: !!ticket.is_resolved,
    status: unanswered ? 'unanswered' : 'answered',
    raw: ticket,
  };
}

export function mapApiTickets(list = []) {
  return list.map(mapApiTicket);
}

export const GRADE_FILTER_OPTIONS = [
  { value: '', label: 'همه پایه‌ها' },
  { value: '7', label: 'هفتم' },
  { value: '8', label: 'هشتم' },
  { value: '9', label: 'نهم' },
  { value: '10', label: 'دهم' },
  { value: '11', label: 'یازدهم' },
  { value: '12', label: 'دوازدهم' },
  { value: 'graduate', label: 'فارغ‌التحصیل' },
];

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'unanswered', label: 'بی‌پاسخ / نخوانده' },
  { value: 'answered', label: 'پاسخ‌داده‌شده / خوانده' },
];
