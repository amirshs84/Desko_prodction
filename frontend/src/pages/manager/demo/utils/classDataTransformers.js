import { formatRelativeDateIran } from '../../../../utils/dateUtils';

const GRADE_COLORS = {
  '7': '#10B981',
  '8': '#3B82F6',
  '9': '#8B5CF6',
  '10': '#F59E0B',
  '11': '#EC4899',
  '12': '#EF4444',
  graduate: '#6B7280',
};

const BAR_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

export function formatCount(num) {
  return toPersianDigits(num.toLocaleString('en-US'));
}

export function buildCapacitySummary({ activeCount, totalStudents, classes }) {
  const total = classes.length;
  const avgCapacity = total > 0 ? Math.round(totalStudents / total) : 0;
  const maxStudents = classes.length
    ? Math.max(...classes.map((c) => c.student_count || 0), 1)
    : 1;
  const crowdedThreshold = Math.max(Math.ceil(avgCapacity * 1.2), 1);
  const crowded = classes.filter((c) => (c.student_count || 0) >= crowdedThreshold).length;
  const healthy = classes.filter((c) => (c.student_count || 0) > 0 && c.is_active).length;
  const crowdedPct = total > 0 ? Math.round((crowded / total) * 100) : 0;
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 0;

  return [
    { label: 'کلاس‌های فعال', value: formatCount(activeCount), icon: 'book', color: '#10B981', bg: '#D1FAE5' },
    { label: 'مجموع دانش‌آموزان', value: formatCount(totalStudents), icon: 'users', color: '#3B82F6', bg: '#DBEAFE' },
    { label: 'میانگین دانش‌آموز هر کلاس', value: `${formatCount(avgCapacity)} نفر`, icon: 'capacity', color: '#8B5CF6', bg: '#EDE9FE' },
    { label: 'کلاس‌های پرجمعیت', value: `${formatCount(crowded)} (${toPersianDigits(crowdedPct)}٪)`, icon: 'alert', color: '#EF4444', bg: '#FEE2E2' },
    { label: 'کلاس‌های دارای دانش‌آموز', value: `${formatCount(healthy)} (${toPersianDigits(healthyPct)}٪)`, icon: 'check', color: '#10B981', bg: '#D1FAE5' },
  ];
}

export function buildGradeDistribution(classes) {
  const counts = {};
  classes.forEach((c) => {
    const key = c.grade_display || c.grade || 'نامشخص';
    counts[key] = (counts[key] || 0) + 1;
  });
  const total = classes.length || 1;
  return Object.entries(counts).map(([name, count], index) => ({
    name,
    value: Math.round((count / total) * 100),
    count,
    color: Object.values(GRADE_COLORS)[index % Object.values(GRADE_COLORS).length],
  }));
}

export function buildStudentCountBars(classes, limit = 6) {
  return [...classes]
    .sort((a, b) => (b.student_count || 0) - (a.student_count || 0))
    .slice(0, limit)
    .map((c, index) => {
      const count = c.student_count || 0;
      const max = Math.max(...classes.map((x) => x.student_count || 0), 1);
      const score = Math.round((count / max) * 100);
      return {
        name: c.name.length > 12 ? `${c.name.slice(0, 12)}…` : c.name,
        score,
        count,
        color: BAR_COLORS[index % BAR_COLORS.length],
        label: toPersianDigits(count),
      };
    });
}

export function buildTopClassesByStudents(classes, limit = 3) {
  const medals = ['🥇', '🥈', '🥉'];
  const max = Math.max(...classes.map((c) => c.student_count || 0), 1);
  return [...classes]
    .sort((a, b) => (b.student_count || 0) - (a.student_count || 0))
    .slice(0, limit)
    .map((c, index) => ({
      rank: index + 1,
      name: c.name,
      rate: Math.round(((c.student_count || 0) / max) * 100),
      count: c.student_count || 0,
      medal: medals[index] || `${index + 1}`,
    }));
}

export function buildAttentionClasses(classes) {
  const items = [];
  classes
    .filter((c) => !c.is_active)
    .slice(0, 2)
    .forEach((c) => {
      items.push({
        name: c.name,
        issue: 'کلاس غیرفعال است',
        variant: 'warning',
      });
    });
  classes
    .filter((c) => c.is_active && (c.student_count || 0) === 0)
    .slice(0, 3 - items.length)
    .forEach((c) => {
      items.push({
        name: c.name,
        issue: 'هنوز دانش‌آموزی ثبت‌نام نشده',
        variant: 'danger',
      });
    });
  return items.slice(0, 3);
}

export function buildRecentActivities(classes) {
  return [...classes]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4)
    .map((c) => ({
      time: formatRelativeDateIran(c.created_at),
      text: `کلاس «${c.name}» (${c.code}) ایجاد شد`,
      icon: 'plus',
      color: '#10B981',
      bg: '#D1FAE5',
    }));
}

export function buildFooterKpis({ activeCount, totalStudents, classes }) {
  const avgStudents = classes.length
    ? (totalStudents / classes.length).toFixed(1)
    : '0';
  return [
    {
      title: 'کلاس‌های فعال',
      value: formatCount(activeCount),
      trend: `${formatCount(classes.length)} کلاس کل`,
      icon: 'book',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'مجموع دانش‌آموزان',
      value: formatCount(totalStudents),
      trend: 'ثبت‌نام‌شده',
      icon: 'users',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'میانگین دانش‌آموز هر کلاس',
      value: toPersianDigits(avgStudents).replace('.', '٫'),
      trend: 'میانگین فعلی',
      icon: 'star',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      title: 'کلاس‌های بدون دانش‌آموز',
      value: formatCount(classes.filter((c) => (c.student_count || 0) === 0).length),
      trend: 'نیاز به ثبت‌نام',
      icon: 'clipboard',
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
  ];
}
