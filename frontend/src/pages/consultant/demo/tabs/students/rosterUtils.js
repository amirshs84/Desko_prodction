/** ستون‌های پیش‌فرض اگر API ستون نفرستد — ساختار پویا برای افزودن ستون بعدی. */
export const FALLBACK_COLUMNS = [
  { key: 'full_name', label: 'نام', type: 'text', metric: false, placeholder: false },
  { key: 'performance', label: 'وضعیت', type: 'heatmap', metric: true, placeholder: false },
  { key: 'study_seconds', label: 'زمان مطالعه', type: 'duration', metric: true, placeholder: false },
  { key: 'session_count', label: 'جلسات', type: 'number', metric: true, placeholder: false },
  { key: 'test_count', label: 'تعداد تست', type: 'number', metric: true, placeholder: true },
  { key: 'last_exam_status', label: 'آخرین آزمون', type: 'text', metric: true, placeholder: true },
  { key: 'grade', label: 'پایه', type: 'text', metric: false, placeholder: false },
  { key: 'class_names', label: 'کلاس‌ها', type: 'text', metric: false, placeholder: false },
  { key: 'tags', label: 'برچسب‌ها', type: 'tags', metric: false, placeholder: false },
  { key: 'groups', label: 'گروه‌های من', type: 'groups', metric: false, placeholder: false },
];

export const PERIODS = [
  { id: 'daily', label: 'روزانه' },
  { id: 'weekly', label: 'هفتگی' },
  { id: 'monthly', label: 'ماهانه' },
];

export const GRADE_OPTIONS = [
  ['7', 'هفتم'], ['8', 'هشتم'], ['9', 'نهم'],
  ['10', 'دهم'], ['11', 'یازدهم'], ['12', 'دوازدهم'],
];

export const ROSTER = {
  pageBg: '#F4FBF7',
  brand: '#059669',
  brandStrong: '#047857',
  brandSoft: '#ECFDF5',
  border: '#E5F0EA',
  ink: '#0F172A',
  muted: '#64748B',
};

/** طیف سبز (خوب) → قرمز (ضعیف) برای performance ۰..۱ */
export function performanceColor(score) {
  const s = Math.max(0, Math.min(1, Number(score) || 0));
  // معکوس: ۱ = سبز، ۰ = قرمز
  const hue = s * 140; // 0=red-ish, 140=green
  return `hsl(${hue} 70% ${s < 0.15 ? 42 : 38}%)`;
}

export function performanceLabel(score) {
  const s = Number(score) || 0;
  if (s <= 0) return 'بدون مطالعه';
  if (s < 0.25) return 'ضعیف';
  if (s < 0.5) return 'متوسط';
  if (s < 0.75) return 'خوب';
  return 'عالی';
}

export function formatDuration(seconds) {
  const totalMin = Math.floor((seconds || 0) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} دقیقه`;
  if (m === 0) return `${h} ساعت`;
  return `${h}س ${m}د`;
}

export function cellValue(student, column) {
  switch (column.key) {
    case 'full_name':
      return student.full_name || 'بدون نام';
    case 'grade':
      return student.grade || '—';
    case 'class_names':
      return (student.class_names || []).join('، ') || '—';
    case 'study_seconds':
      return student.study_seconds ?? 0;
    case 'session_count':
      return student.session_count ?? 0;
    case 'test_count':
      return student.test_count;
    case 'last_exam_status':
      return student.last_exam_status;
    case 'performance':
      return student.performance ?? 0;
    case 'tags':
      return student.tags || [];
    case 'groups':
      return student.groups || [];
    default:
      return student[column.key] ?? student.values?.[column.key] ?? null;
  }
}
