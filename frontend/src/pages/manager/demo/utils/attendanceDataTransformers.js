import { toPersianDigits, formatCount } from './classDataTransformers';
import { STATUS_CONFIG, TABLE_TABS } from '../data/attendanceMockData';

function formatSignedPercent(value) {
  const n = Number(value) || 0;
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${toPersianDigits(Math.abs(n).toFixed(n % 1 === 0 ? 0 : 1))}٪`;
}

function formatSignedCount(value, unit = 'نفر') {
  const n = Number(value) || 0;
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${toPersianDigits(Math.abs(n))} ${unit}`;
}

function formatTimeDisplay(value) {
  if (!value) return '—';
  return toPersianDigits(value);
}

export function transformAttendanceData(raw) {
  const d = raw || {};

  const totalStudents = d.total_students ?? 0;
  const presentCount = d.present_count ?? 0;
  const absentCount = d.absent_count ?? 0;
  const delayCount = d.delay_count ?? 0;
  const leaveCount = d.leave_count ?? 0;
  const teachersAbsent = d.teachers_absent ?? 0;
  const attendanceRate = d.attendance_rate ?? 0;
  const attendanceChange = d.attendance_change_percent ?? 0;
  const absentChange = d.absent_change ?? 0;
  const delayChange = d.delay_change ?? 0;
  const teachersAbsentChange = d.teachers_absent_change ?? 0;
  const atRiskCount = d.at_risk_count ?? 0;
  const atRiskMinDays = d.at_risk_min_days ?? 5;

  const summaryStats = [
    {
      title: 'حضور امروز',
      value: `${toPersianDigits(String(attendanceRate))}٪`,
      trend: formatSignedPercent(attendanceChange),
      trendLabel: 'نسبت به دیروز',
      trendUp: attendanceChange > 0,
      icon: 'attendance',
      iconBg: '#D1FAE5',
      iconColor: '#10B981',
    },
    {
      title: 'غیبت امروز',
      value: `${formatCount(absentCount)} نفر`,
      trend: formatSignedCount(absentChange),
      trendLabel: 'نسبت به دیروز',
      trendUp: absentChange > 0,
      isPositiveDown: true,
      icon: 'absent',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
    },
    {
      title: 'تأخیر امروز',
      value: `${formatCount(delayCount)} نفر`,
      trend: formatSignedCount(delayChange),
      trendLabel: 'نسبت به دیروز',
      trendUp: delayChange > 0,
      isWarning: true,
      icon: 'delay',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      title: 'معلمان غایب',
      value: `${formatCount(teachersAbsent)} نفر`,
      trend: formatSignedCount(teachersAbsentChange),
      trendLabel: 'نسبت به دیروز',
      trendUp: teachersAbsentChange > 0,
      isPositiveDown: true,
      icon: 'teacher',
      iconBg: '#DBEAFE',
      iconColor: '#3B82F6',
    },
    {
      title: 'دانش‌آموزان پرریسک',
      value: `${formatCount(atRiskCount)} نفر`,
      subtext: `بیش از ${toPersianDigits(atRiskMinDays)} روز غیبت`,
      icon: 'risk',
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
  ];

  const statusDistribution = Array.isArray(d.status_distribution)
    ? d.status_distribution
    : [
      { name: 'حاضر', value: 0, count: 0, color: '#10B981' },
      { name: 'غایب', value: 0, count: 0, color: '#EF4444' },
      { name: 'تأخیر', value: 0, count: 0, color: '#F59E0B' },
      { name: 'مرخصی', value: 0, count: 0, color: '#3B82F6' },
    ];

  const attendanceTrend = Array.isArray(d.attendance_trend)
    ? d.attendance_trend.map((item) => ({
      date: toPersianDigits(item.date || ''),
      value: item.value ?? 0,
      iso: item.iso,
    }))
    : [];

  const chartYDomain = (() => {
    if (attendanceTrend.length === 0) return [0, 100];
    const values = attendanceTrend.map((x) => x.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    return [Math.max(0, Math.floor(min / 10) * 10), Math.min(100, Math.ceil(max / 10) * 10 || 100)];
  })();

  const atRiskStudents = (d.at_risk_students || []).map((s) => ({
    name: s.name || '—',
    className: s.class_name || '—',
    days: s.days ?? 0,
    daysLabel: toPersianDigits(s.days ?? 0),
    initials: s.initials || '—',
    color: s.color || '#EF4444',
    userId: s.user_id,
  }));

  const classesMostAbsence = (d.classes_most_absence || []).map((item) => ({
    name: item.name || '—',
    rate: item.rate ?? 0,
    rateLabel: toPersianDigits(String(item.rate ?? 0)),
    color: item.color || '#EF4444',
    classId: item.class_id,
  }));

  const table = d.table || {};
  const tableRows = (table.results || []).map((row) => ({
    id: row.user_id,
    name: row.name || '—',
    initials: row.initials || '—',
    color: row.color || '#10B981',
    className: row.class_name || '—',
    status: row.status === 'present' ? 'present' : 'absent',
    entry: formatTimeDisplay(row.entry),
    exit: formatTimeDisplay(row.exit),
    note: row.note || '—',
  }));

  const tableMeta = {
    count: table.count ?? 0,
    page: table.page ?? 1,
    pageSize: table.page_size ?? 20,
    totalPages: table.total_pages ?? 1,
  };

  const classOptions = (d.class_options || []).map((opt) => ({
    id: opt.id == null ? '' : String(opt.id),
    name: opt.name || '—',
  }));

  return {
    date: d.date || '',
    totalStudents,
    presentCount,
    absentCount,
    leaveCount,
    summaryStats,
    statusDistribution,
    attendanceTrend,
    chartYDomain,
    atRiskStudents,
    classesMostAbsence,
    tableRows,
    tableMeta,
    classOptions,
    statusConfig: STATUS_CONFIG,
    tableTabs: TABLE_TABS,
  };
}
