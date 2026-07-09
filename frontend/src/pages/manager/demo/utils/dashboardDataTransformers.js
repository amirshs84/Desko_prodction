import { toPersianDigits, formatCount } from './classDataTransformers';

const AVATAR_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

function formatSignedPercent(value) {
  const n = Number(value) || 0;
  const sign = n > 0 ? '+' : '';
  return `${sign}${toPersianDigits(Math.abs(n).toFixed(n % 1 === 0 ? 0 : 1))}٪`;
}

function formatSignedCount(value, unit = 'نفر') {
  const n = Number(value) || 0;
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${toPersianDigits(Math.abs(n))} ${unit}`;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}.${parts[1][0]}`;
}

function formatScore(score) {
  if (score == null || score === '') return '—';
  const n = Number(score);
  if (Number.isNaN(n)) return toPersianDigits(score);
  return toPersianDigits(n % 1 === 0 ? String(n) : n.toFixed(1));
}

export function transformDashboardData(raw) {
  const d = raw || {};

  const totalStudents = d.total_students ?? 0;
  const totalTeachers = d.total_teachers ?? 0;
  const totalExams = d.total_exams ?? 0;
  const totalClasses = d.total_classes ?? 0;
  const activeClasses = d.active_classes ?? 0;
  const atRiskCount = d.at_risk_count ?? 0;

  const studentsChange = d.students_change_percent ?? 0;
  const teachersChange = d.teachers_change_percent ?? 0;
  const examsChange = d.exams_change_percent ?? 0;
  const classesChange = d.classes_change_percent ?? 0;
  const atRiskChange = d.at_risk_change ?? 0;

  const avgGrade = d.avg_grade;
  const attendanceRate = d.attendance_rate ?? 0;
  const schoolPerformance = d.school_performance ?? 0;
  const parentParticipation = d.parent_participation ?? 0;
  const curriculumProgress = d.curriculum_progress ?? 0;
  const studentParticipation = d.student_participation_rate ?? 0;

  const attendanceTrend = Array.isArray(d.attendance_trend_30d)
    ? d.attendance_trend_30d.map((item) => ({
      date: toPersianDigits(item.date || ''),
      value: item.value ?? 0,
    }))
    : [];

  const performanceDonut = Array.isArray(d.performance_distribution)
    ? d.performance_distribution
    : [
      { name: 'عالی', value: 0, color: '#10B981' },
      { name: 'خوب', value: 0, color: '#34D399' },
      { name: 'متوسط', value: 0, color: '#F59E0B' },
      { name: 'نیاز به بهبود', value: 0, color: '#EF4444' },
    ];

  const topStudents = (d.top_students_week || []).map((s, index) => {
    const grade = s.grade || '';
    const gradeLabel = grade && !grade.startsWith('پایه') ? `پایه ${grade}` : grade;
    return {
      rank: s.rank || index + 1,
      name: s.name || '—',
      grade: gradeLabel,
      score: formatScore(s.score),
    };
  });

  const topStudentsMobile = topStudents.map((s, index) => ({
    rank: s.rank,
    name: s.name,
    score: s.score,
    initials: getInitials(s.name),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  }));

  const avgGradeDisplay = avgGrade == null ? '۰' : toPersianDigits(String(avgGrade));
  const avgGradeUnit = avgGrade == null ? '/ ۱۰۰' : '/ ۱۰۰';

  const desktopStats = [
    {
      title: 'دانش‌آموزان',
      value: formatCount(totalStudents),
      trend: studentsChange,
      trendLabel: `${formatSignedPercent(studentsChange)} نسبت به ماه قبل`,
      iconKey: 'users',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'معلمان',
      value: formatCount(totalTeachers),
      trend: teachersChange,
      trendLabel: `${formatSignedPercent(teachersChange)} نسبت به ماه قبل`,
      iconKey: 'teachers',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'آزمون‌ها',
      value: formatCount(totalExams),
      trend: examsChange,
      trendLabel: `${formatSignedPercent(examsChange)} نسبت به ماه قبل`,
      iconKey: 'exams',
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      title: 'کلاس‌ها',
      value: formatCount(totalClasses),
      trend: classesChange,
      trendLabel: `${formatSignedPercent(classesChange)} نسبت به ماه قبل`,
      iconKey: 'classes',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      title: 'دانش‌آموزان در معرض خطر',
      value: formatCount(atRiskCount),
      trend: atRiskChange,
      trendLabel: `${formatSignedCount(atRiskChange)} نسبت به ماه قبل`,
      iconKey: 'risk',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      isDanger: true,
    },
  ];

  const metrics = [
    {
      title: 'میانگین نمرات',
      value: avgGradeDisplay,
      unit: avgGradeUnit,
      trendLabel: `${formatSignedPercent(d.avg_grade_change_percent ?? 0)} نسبت به ماه قبل`,
      iconKey: 'star',
    },
    {
      title: 'نرخ حضور و غیاب',
      value: `${toPersianDigits(String(attendanceRate))}٪`,
      trendLabel: `${formatSignedPercent(d.attendance_change_percent ?? 0)} نسبت به ماه قبل`,
      iconKey: 'attendance',
    },
    {
      title: 'عملکرد کل مدرسه',
      value: `${toPersianDigits(String(schoolPerformance))}٪`,
      trendLabel: `${formatSignedPercent(d.school_performance_change_percent ?? 0)} نسبت به ماه قبل`,
      iconKey: 'performance',
    },
  ];

  const performanceKpis = [
    {
      title: 'کلاس‌های فعال',
      value: formatCount(activeClasses),
      iconKey: 'classes',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'مشارکت والدین',
      value: `${toPersianDigits(String(parentParticipation))}٪`,
      iconKey: 'users',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'نرخ مشارکت دانش‌آموزان',
      value: `${toPersianDigits(String(studentParticipation))}٪`,
      iconKey: 'activity',
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      title: 'نسبت دانش‌آموز به معلم',
      value: toPersianDigits(d.student_teacher_ratio || '۰:۰'),
      iconKey: 'teachers',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      title: 'نرخ پیشرفت برنامه درسی',
      value: `${toPersianDigits(String(curriculumProgress))}٪`,
      iconKey: 'target',
      iconBg: '#FFE4E6',
      iconColor: '#F43F5E',
    },
  ];

  const mobileStats = [
    {
      title: 'دانش‌آموزان',
      value: formatCount(totalStudents),
      trend: formatSignedPercent(studentsChange),
      iconKey: 'users',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'معلمان',
      value: formatCount(totalTeachers),
      trend: formatSignedPercent(teachersChange),
      iconKey: 'teachers',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'کلاس‌ها',
      value: formatCount(totalClasses),
      trend: formatSignedPercent(classesChange),
      iconKey: 'classes',
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      title: 'دانش‌آموزان در معرض خطر',
      value: formatCount(atRiskCount),
      trend: formatSignedCount(atRiskChange),
      iconKey: 'risk',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      isDanger: true,
    },
    {
      title: 'آزمون‌ها',
      value: formatCount(totalExams),
      trend: formatSignedPercent(examsChange),
      iconKey: 'exams',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      title: 'عملکرد کل مدرسه',
      value: `${toPersianDigits(String(schoolPerformance))}٪`,
      trend: formatSignedPercent(d.school_performance_change_percent ?? 0),
      iconKey: 'performance',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'نرخ حضور و غیاب',
      value: `${toPersianDigits(String(attendanceRate))}٪`,
      trend: formatSignedPercent(d.attendance_change_percent ?? 0),
      iconKey: 'attendance',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'میانگین نمرات',
      value: avgGrade == null ? '۰/۱۰۰' : `${avgGradeDisplay}/۱۰۰`,
      trend: formatSignedPercent(d.avg_grade_change_percent ?? 0),
      iconKey: 'star',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
  ];

  const chartYDomain = (() => {
    if (attendanceTrend.length === 0) return [0, 100];
    const values = attendanceTrend.map((x) => x.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    return [Math.max(0, min - 10), Math.min(100, max + 5)];
  })();

  return {
    totalStudents,
    desktopStats,
    metrics,
    attendanceTrend,
    chartYDomain,
    performanceDonut,
    topStudents,
    topStudentsMobile,
    performanceKpis,
    mobileStats,
    reportCards: [],
  };
}
