/** محتوای نمایشی داشبورد، هم‌تراز با طرح دسکتاپ و موبایل. */

export const DESKTOP_STATS = [
  {
    id: 'students',
    value: '۴۸',
    label: 'دانش‌آموز تحت مشاوره',
    tone: 'green',
    icon: 'users',
    tab: 'students',
  },
  {
    id: 'sessions',
    value: '۶',
    label: 'جلسات امروز',
    tone: 'blue',
    icon: 'calendar',
    target: 'today-sessions',
  },
  {
    id: 'follow',
    value: '۹',
    label: 'دانش‌آموز نیازمند پیگیری',
    tone: 'coral',
    icon: 'alert',
    target: 'priority-students',
  },
  {
    id: 'plans',
    value: '۱۲',
    label: 'برنامه‌های نیازمند بررسی',
    tone: 'purple',
    icon: 'file',
    tab: 'planning',
  },
];

export const PRIORITY_ROWS = [
  {
    id: 'sahar',
    name: 'سحر محمدی',
    status: 'تاخیر در مطالعه',
    tone: 'amber',
    reason: 'کاهش ساعات مطالعه',
    date: '۱۴۰۴/۰۸/۱۸',
    action: 'بررسی برنامه',
    actionKind: 'plan',
    tags: ['fresh', 'recent', 'active', 'attention'],
  },
  {
    id: 'arian',
    name: 'آرین کاظمی',
    status: 'نیازمند پیگیری',
    tone: 'amber',
    reason: 'عدم تحویل تکالیف',
    date: '۱۴۰۴/۰۸/۱۵',
    action: 'تماس با والدین',
    actionKind: 'call',
    tags: ['fresh', 'recent', 'attention'],
  },
  {
    id: 'mobina',
    name: 'مبینا احمدی',
    status: 'نیازمند پیگیری',
    tone: 'amber',
    reason: 'کاهش انگیزه',
    date: '۱۴۰۴/۰۸/۱۳',
    action: 'بررسی برنامه',
    actionKind: 'plan',
    tags: ['fresh', 'active', 'attention'],
  },
  {
    id: 'parsa',
    name: 'پارسا رضایی',
    status: 'عادی',
    tone: 'green',
    reason: 'اضطراب امتحانات',
    date: '۱۴۰۴/۰۸/۱۰',
    action: 'تماس با والدین',
    actionKind: 'call',
    tags: ['fresh'],
  },
];

export const DESKTOP_FILTERS = [
  { id: 'fresh', label: 'تازه‌ها' },
  { id: 'recent', label: 'اخیر' },
  { id: 'active', label: 'فعال‌ترین‌ها' },
  { id: 'status', label: 'وضعیت' },
];

export const INBOX_THREADS = [
  {
    id: 'in-1',
    name: 'سحر محمدی',
    time: '۲۲ ساعت پیش',
    preview: 'سلام استاد، میشه لطفا برنامه درسی هفته را بفرستید…',
  },
  {
    id: 'in-2',
    name: 'مبینا احمدی',
    time: '۴۵ دقیقه پیش',
    preview: 'تونستم در جلسه شرکت کنم. امکانش هست جابه‌جا کنیم؟',
  },
  {
    id: 'in-3',
    name: 'آرین کاظمی',
    time: '۴۵ دقیقه پیش',
    preview: 'موجودم، احتمالا پشت سوال داشتم. می‌تونید توضیح بدید؟',
  },
];

export const TODAY_SESSIONS = [
  {
    id: 's1',
    time: '۰۸:۰۰',
    name: 'نگار رضایی',
    topic: 'برنامه‌ریزی درسی',
    status: 'برگزار شده',
    tone: 'green',
  },
  {
    id: 's2',
    time: '۱۰:۰۰',
    name: 'آرین کاظمی',
    topic: 'مدیریت استرس',
    status: 'در حال برگزاری',
    tone: 'blue',
  },
  {
    id: 's3',
    time: '۱۳:۰۰',
    name: 'سعید محمدی',
    topic: 'مشاوره تحصیلی',
    status: 'برنامه‌ریزی شده',
    tone: 'gray',
  },
];

export const OVERDUE_ITEMS = [
  { id: 'o1', name: 'نگار رضایی', reason: 'عدم تحویل تکالیف', date: '۱۴۰۴/۰۸/۱۲' },
  { id: 'o2', name: 'محمد محمدی', reason: 'تاخیر در پروژه درسی', date: '۱۴۰۴/۰۸/۱۰' },
  { id: 'o3', name: 'آرین کاظمی', reason: 'پیگیری مشاوره', date: '۱۴۰۴/۰۸/۰۸' },
];

export const MOBILE_STATS = [
  {
    id: 'follow',
    value: '۹',
    label: 'نیازمند پیگیری',
    action: 'شروع پیگیری',
    tone: 'coral',
    icon: 'alert',
    target: 'priority-students',
  },
  {
    id: 'plans',
    value: '۱۲',
    label: 'برنامه منتظر بررسی',
    action: 'تایید سریع',
    tone: 'purple',
    icon: 'file',
    tab: 'planning',
  },
  {
    id: 'sessions',
    value: '۶',
    label: 'جلسه امروز',
    action: 'مدیریت زمان',
    tone: 'peach',
    icon: 'calendar',
    tab: 'planning',
  },
  {
    id: 'students',
    value: '۴۲',
    label: 'دانش‌آموز فعال',
    action: 'ثبت جلسه',
    tone: 'green',
    icon: 'users',
    tab: 'planning',
  },
];

export const MOBILE_PRIORITIES = [
  {
    id: 'p1',
    name: 'سعید محمدی',
    grade: 'پایه دهم',
    issue: 'افت شدید نمرات ریاضی',
    badge: 'بسیار فوری',
    tone: 'red',
    tag: 'academic',
  },
  {
    id: 'p2',
    name: 'مهسا احمدی',
    grade: 'پایه یازدهم',
    issue: 'اضطراب امتحانات و افت تمرکز',
    badge: 'نیاز به توجه',
    tone: 'amber',
    tag: 'anxiety',
  },
  {
    id: 'p3',
    name: 'علیرضا کریمی',
    grade: 'پایه نهم',
    issue: 'تعارض با همکلاسی‌ها',
    badge: 'در حال پیگیری',
    tone: 'blue',
    tag: 'sleep',
  },
  {
    id: 'p4',
    name: 'مهدی احمدی',
    grade: 'پایه یازدهم',
    issue: 'اختلال خواب و افت تمرکز',
    badge: 'نیاز به توجه',
    tone: 'amber',
    tag: 'sleep',
  },
  {
    id: 'p5',
    name: 'سحر محمدی',
    grade: 'پایه دهم',
    issue: 'تاخیر در شروع مطالعه',
    badge: 'بسیار فوری',
    tone: 'red',
    tag: 'academic',
  },
  {
    id: 'p6',
    name: 'پارسا رضایی',
    grade: 'پایه دوازدهم',
    issue: 'اضطراب قبل از آزمون',
    badge: 'در حال پیگیری',
    tone: 'blue',
    tag: 'anxiety',
  },
  {
    id: 'p7',
    name: 'نگار رضایی',
    grade: 'پایه یازدهم',
    issue: 'به‌هم‌ریختگی برنامه خواب',
    badge: 'نیاز به توجه',
    tone: 'amber',
    tag: 'sleep',
  },
  {
    id: 'p8',
    name: 'محمد محمدی',
    grade: 'پایه دهم',
    issue: 'افت پیوسته نمرات',
    badge: 'بسیار فوری',
    tone: 'red',
    tag: 'academic',
  },
  {
    id: 'p9',
    name: 'نازنین کریمی',
    grade: 'پایه نهم',
    issue: 'نگرانی از امتحان شفاهی',
    badge: 'در حال پیگیری',
    tone: 'blue',
    tag: 'anxiety',
  },
];

export const MOBILE_FILTERS = [
  { id: 'all', label: 'همه اولویت‌ها', icon: 'flame' },
  { id: 'sleep', label: 'خواب و برنامه‌ریزی', icon: 'moon' },
  { id: 'academic', label: 'افت تحصیلی', icon: 'cap' },
  { id: 'anxiety', label: 'اضطراب', icon: 'heart' },
  { id: 'everyone', label: 'کل', icon: 'users' },
];

export const UNREAD_MESSAGES = [
  {
    id: 'm1',
    name: 'مادر علی رضایی',
    role: 'والدین دانش‌آموز',
    time: '۰۹:۱۵',
    count: '۳',
    preview: 'سلام، وقت بخیر. آیا امکان داره فردا…',
  },
  {
    id: 'm2',
    name: 'پدر زهرا محمدی',
    role: 'والدین دانش‌آموز',
    time: '۰۸:۴۷',
    count: '۱',
    preview: 'با سلام، نتایج بررسی‌ها رو دریافت کردیم…',
  },
  {
    id: 'm3',
    name: 'مادر نازنین کریمی',
    role: 'والدین دانش‌آموز',
    time: '۰۸:۲۳',
    count: '۲',
    preview: 'ممنون از پیگیری شما. دخترم بهتر شده…',
  },
  {
    id: 'm4',
    name: 'معلم فارسی',
    role: 'معلم',
    time: '۰۷:۵۶',
    count: '۱',
    preview: 'در مورد جلسه مشاوره هفته آینده…',
  },
];
