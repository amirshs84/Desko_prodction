import { toPersianDigits } from './classDataTransformers';

const GRADE_META = {
  '10': { label: 'پایه دهم', color: '#10B981' },
  '11': { label: 'پایه یازدهم', color: '#14B8A6' },
  '12': { label: 'پایه دوازدهم', color: '#3B82F6' },
};

const TRACKED_GRADES = ['10', '11', '12'];

export function formatSecondsAsTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return toPersianDigits(`${hours}:${String(minutes).padStart(2, '0')}`);
}

export function getGradeLabel(grade) {
  if (!grade) return '';
  if (GRADE_META[grade]) return GRADE_META[grade].label;
  const map = {
    '7': 'پایه هفتم',
    '8': 'پایه هشتم',
    '9': 'پایه نهم',
    graduate: 'فارغ‌التحصیل',
  };
  return map[grade] || grade;
}

/** میانگین نمرات — در بک‌اند نداریم؛ ساختار پایه با مقدار خالی */
export function buildGradeAverageData() {
  return TRACKED_GRADES.map((code) => ({
    grade: GRADE_META[code].label,
    value: 0,
    color: GRADE_META[code].color,
    label: '',
  }));
}

/** ۵ دانش‌آموز با پایین‌ترین معدل — معدل در بک‌اند نیست */
export function buildLowestGpaStudents() {
  return [];
}

/** تا ۵ دانش‌آموز هر پایه — بدون معدل (در بک‌اند نیست) */
export function buildTopStudentsByGrade(students) {
  const byGrade = (code) =>
    (students || [])
      .filter((s) => s.grade === code)
      .slice(0, 5)
      .map((s, index) => ({
        rank: index + 1,
        name: s.full_name || '—',
        gpa: '',
      }));

  return {
    grade10: byGrade('10'),
    grade11: byGrade('11'),
    grade12: byGrade('12'),
  };
}

/** ۵ دانش‌آموز پرکاربرد بر اساس week_total */
export function buildMostActiveStudents(students) {
  return [...(students || [])]
    .sort((a, b) => (b.week_total || 0) - (a.week_total || 0))
    .slice(0, 5)
    .map((s, index) => ({
      rank: index + 1,
      name: s.full_name || '—',
      grade: getGradeLabel(s.grade),
      time: formatSecondsAsTime(s.week_total),
    }));
}

/** میانگین زمان مطالعه روزانه (today_total) به تفکیک پایه */
export function buildStudyTimeByGrade(students) {
  return TRACKED_GRADES.map((code) => {
    const group = (students || []).filter((s) => s.grade === code);
    const avgSeconds = group.length
      ? group.reduce((sum, s) => sum + (s.today_total || 0), 0) / group.length
      : 0;
    const minutes = Math.round(avgSeconds / 60);
    return {
      grade: GRADE_META[code].label,
      time: formatSecondsAsTime(avgSeconds),
      minutes,
      color: GRADE_META[code].color,
    };
  });
}
