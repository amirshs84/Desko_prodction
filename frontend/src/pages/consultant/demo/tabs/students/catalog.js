/** فهرست نمایشی دانش‌آموزان، هم‌تراز با طرح دسکتاپ و موبایل. */

export const STUDENT_STATS = [
  {
    id: 'progress',
    value: '۴۲',
    label: 'پیشرفت جدید',
    hint: 'از آخرین ورود شما',
    tone: 'green',
    icon: 'leaf',
  },
  {
    id: 'avg',
    value: '۸۴٪',
    label: 'میانگین تحصیل',
    hint: 'برنامه',
    tone: 'green',
    icon: 'trend',
  },
  {
    id: 'week',
    value: '۲۳',
    label: 'فعال این هفته',
    tone: 'blue',
    icon: 'calendar',
  },
  {
    id: 'total',
    value: '۴۸',
    label: 'کل دانش‌آموزان',
    tone: 'coral',
    icon: 'alert',
  },
];

const detail = {
  lastSession: { date: '۱۴۰۴/۰۸/۱۵', time: 'ساعت ۰۹:۳۰' },
  nextSession: { date: 'چهارشنبه ۲۸ آبان', time: 'ساعت ۱۰:۰۰' },
  note: 'نیاز به تمرکز بیشتر در درس‌های اصلی. پیگیری مداوم توصیه می‌شود.',
};

export const DESKTOP_STUDENTS = [
  {
    id: 'sahar',
    name: 'سحر محمدی',
    grade: 'پایه دهم',
    track: 'فیزیک',
    percent: 63,
    daysAgo: 6,
    status: 'attention',
    groups: ['all', 'attention'],
    ...detail,
  },
  {
    id: 'arian',
    name: 'آرین کاظمی',
    grade: 'پایه یازدهم',
    track: 'تجربی',
    percent: 88,
    daysAgo: 4,
    status: 'active',
    groups: ['all', 'tops', 'active'],
    ...detail,
  },
  {
    id: 'mobina',
    name: 'مبینا احمدی',
    grade: 'پایه دوازدهم',
    track: 'انسانی',
    percent: 75,
    daysAgo: 2,
    status: 'active',
    groups: ['all', 'tops', 'recent', 'active'],
    ...detail,
  },
  {
    id: 'parsa',
    name: 'پارسا رضایی',
    grade: 'پایه دوازدهم',
    track: 'تجربی',
    percent: 63,
    daysAgo: 6,
    status: 'attention',
    groups: ['all', 'attention'],
    ...detail,
  },
  {
    id: 'alireza',
    name: 'علیرضا صادقی',
    grade: 'پایه دوازدهم',
    track: 'ریاضی',
    percent: 56,
    daysAgo: 1,
    status: 'active',
    groups: ['all', 'recent', 'active'],
    ...detail,
  },
  {
    id: 'amir',
    name: 'امیرحسین قاسمی',
    grade: 'پایه دهم',
    track: 'تجربی',
    percent: 68,
    daysAgo: 5,
    status: 'active',
    groups: ['all', 'active'],
    ...detail,
  },
  {
    id: 'fatemeh',
    name: 'فاطمه نادری',
    grade: 'پایه دوازدهم',
    track: 'انسانی',
    percent: 71,
    daysAgo: 2,
    status: 'attention',
    groups: ['all', 'attention', 'recent'],
    ...detail,
    note: 'افت تمرکز در آزمون‌های آزمایشی. جلسه مرور پیشنهاد شده است.',
  },
  {
    id: 'sara',
    name: 'سارا رضایی',
    grade: 'پایه دوازدهم',
    track: 'تجربی',
    percent: 93,
    daysAgo: 6,
    status: 'active',
    groups: ['all', 'tops'],
    ...detail,
  },
  {
    id: 'ali',
    name: 'علی‌رضا صادقی',
    grade: 'پایه دهم',
    track: 'ریاضی',
    percent: 83,
    daysAgo: 3,
    status: 'active',
    groups: ['all', 'tops', 'recent', 'active'],
    ...detail,
  },
];

export const DESKTOP_FILTERS = [
  { id: 'all', label: 'کل دانش‌آموزان', count: '۴۸' },
  { id: 'recent', label: 'اخیر', count: '۶' },
  { id: 'tops', label: 'تاپ‌های دانش‌آموزها', count: '۸' },
  { id: 'active', label: 'فعال این‌روزها', count: '۱۲' },
];

export const MOBILE_STUDENTS = [
  {
    id: 'm-sara',
    name: 'سارا رضایی',
    grade: 'پایه دوازدهم',
    track: 'تجربی',
    percent: 93,
    daysAgo: 6,
    rank: 1,
    status: 'active',
    groups: ['top', 'tops', 'all'],
    ...detail,
  },
  {
    id: 'm-arian',
    name: 'آرین کاظمی',
    grade: 'پایه یازدهم',
    track: 'تجربی',
    percent: 88,
    daysAgo: 4,
    rank: 2,
    status: 'active',
    groups: ['top', 'tops', 'all'],
    ...detail,
  },
  {
    id: 'm-mobina',
    name: 'مبینا احمدی',
    grade: 'پایه دوازدهم',
    track: 'انسانی',
    percent: 87,
    daysAgo: 1,
    rank: 3,
    status: 'active',
    groups: ['top', 'tops', 'all', 'recent'],
    ...detail,
  },
  {
    id: 'm-parsa',
    name: 'پارسا رضایی',
    grade: 'پایه دوازدهم',
    track: 'تجربی',
    percent: 85,
    daysAgo: 2,
    rank: 4,
    status: 'active',
    groups: ['top', 'tops', 'all', 'recent'],
    ...detail,
  },
  {
    id: 'm-ali',
    name: 'علی‌رضا صادقی',
    grade: 'پایه دهم',
    track: 'ریاضی',
    percent: 83,
    daysAgo: 3,
    rank: 5,
    status: 'active',
    groups: ['top', 'tops', 'all', 'recent'],
    ...detail,
  },
  {
    id: 'm-fatemeh',
    name: 'فاطمه نادری',
    grade: 'پایه دوازدهم',
    track: 'انسانی',
    percent: 79,
    daysAgo: 5,
    rank: 6,
    status: 'active',
    groups: ['top', 'all'],
    ...detail,
  },
  {
    id: 'm-sahar',
    name: 'سحر محمدی',
    grade: 'پایه دهم',
    track: 'فیزیک',
    percent: 63,
    daysAgo: 6,
    rank: null,
    status: 'attention',
    groups: ['attention', 'all'],
    ...detail,
  },
  {
    id: 'm-parsa-risk',
    name: 'پارسا محمدی',
    grade: 'پایه یازدهم',
    track: 'ریاضی',
    percent: 58,
    daysAgo: 4,
    rank: null,
    status: 'attention',
    groups: ['attention', 'all'],
    ...detail,
  },
];

export const MOBILE_FILTERS = [
  { id: 'attention', label: 'نیازمند توجه', icon: 'alert' },
  { id: 'tops', label: 'تاپ‌های دانش‌آموزها', icon: 'trophy' },
  { id: 'all', label: 'همه دانش‌آموزان', icon: 'users' },
  { id: 'top', label: 'دانش‌آموزان برتر', icon: 'star' },
];

export function filterStudents(list, filterId, query) {
  const q = (query || '').trim();
  const matched = list.filter((student) => {
    const inGroup = filterId === 'all' || student.groups.includes(filterId);
    const haystack = `${student.name} ${student.grade} ${student.track}`;
    return inGroup && (!q || haystack.includes(q));
  });
  if (filterId === 'top') {
    return [...matched].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  }
  return matched;
}
