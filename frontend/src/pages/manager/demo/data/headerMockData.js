export const ACADEMIC_YEARS = [
  { id: '1404-1405', label: '۱۴۰۴-۱۴۰۵', active: true },
  { id: '1403-1404', label: '۱۴۰۳-۱۴۰۴', active: false },
  { id: '1402-1403', label: '۱۴۰۲-۱۴۰۳', active: false },
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'غیبت ۳ دانش‌آموز',
    desc: 'کلاس ۸/۲ — امروز ۹:۳۰',
    time: '۱۰ دقیقه پیش',
    unread: true,
    type: 'warning',
  },
  {
    id: 'n2',
    title: 'نمرات ریاضی ثبت شد',
    desc: 'آزمون میان‌ترم — ۳۲ نفر',
    time: '۱ ساعت پیش',
    unread: true,
    type: 'success',
  },
  {
    id: 'n3',
    title: 'درخواست مرخصی معلم',
    desc: 'خانم احمدی — ۲ روز',
    time: 'دیروز',
    unread: false,
    type: 'info',
  },
  {
    id: 'n4',
    title: 'یادآوری جلسه اولیا',
    desc: 'پنج‌شنبه ساعت ۱۶',
    time: 'دیروز',
    unread: false,
    type: 'info',
  },
];

export const INITIAL_MESSAGES = [
  {
    id: 'm1',
    from: 'خانم رضایی',
    role: 'معلم ریاضی',
    preview: 'برنامه آزمون پایانی را تأیید می‌کنید؟',
    time: '۱۲:۴۵',
    unread: true,
    avatar: 'ر',
  },
  {
    id: 'm2',
    from: 'والدین علی محمدی',
    role: 'اولیا',
    preview: 'سلام، لطفاً وضعیت حضور فرزندم را...',
    time: '۱۱:۲۰',
    unread: true,
    avatar: 'ع',
  },
  {
    id: 'm3',
    from: 'آقای کریمی',
    role: 'معاون',
    preview: 'گزارش هفتگی آماده بررسی است.',
    time: 'دیروز',
    unread: false,
    avatar: 'ک',
  },
];

export const UPCOMING_EVENTS = [
  {
    id: 'e1',
    title: 'جلسه شورای معلمان',
    date: 'امروز',
    time: '۱۴:۰۰',
    color: '#10B981',
  },
  {
    id: 'e2',
    title: 'آزمون علوم — پایه هشتم',
    date: 'شنبه',
    time: '۰۸:۳۰',
    color: '#3B82F6',
  },
  {
    id: 'e3',
    title: 'مهلت ثبت نمرات',
    date: 'یکشنبه',
    time: '۲۳:۵۹',
    color: '#F59E0B',
  },
];
