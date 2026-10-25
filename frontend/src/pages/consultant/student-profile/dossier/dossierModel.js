import { useEffect, useMemo, useState } from 'react';
import { DESKTOP_STUDENTS, MOBILE_STUDENTS } from '../../demo/tabs/students/catalog';
import { faNum } from '../../demo/lib/format';

export const DOSSIER_TABS = [
  { id: 'overview', label: 'اطلاعات کلی' },
  { id: 'calendar', label: 'تقویم و برنامه‌ریزی' },
  { id: 'actual-calendar', label: 'تقویم عملی' },
  { id: 'analytics', label: 'گزارش و عملکرد' },
  { id: 'interactions', label: 'پیام‌ها و یادداشت‌ها' },
  { id: 'identity', label: 'اطلاعات هویتی' },
  { id: 'records', label: 'سوابق تحصیلی' },
  { id: 'sessions', label: 'جلسات مشاوره' },
  { id: 'reports', label: 'گزارش‌ها' },
  { id: 'notes', label: 'یادداشت‌ها' },
  { id: 'files', label: 'فایل‌ها' },
];

export const DESIGN_TABS = new Set(['records', 'sessions', 'reports', 'notes', 'files']);

export function profileTabFromPath(pathname, userId) {
  const base = `/consultant/student/${userId}`;
  if (!pathname.startsWith(base)) return null;
  const rest = pathname.slice(base.length);
  if (rest.startsWith('/calendar')) return 'calendar';
  if (rest.startsWith('/actual-calendar')) return 'actual-calendar';
  if (rest.startsWith('/analytics')) return 'analytics';
  if (rest.startsWith('/interactions') || rest.startsWith('/messages')) return 'interactions';
  if (rest.startsWith('/identity')) return 'identity';
  return null;
}

const ARIAN_SUBJECTS = [
  { name: 'زیست شناسی', score: 18.5 },
  { name: 'شیمی', score: 18.7 },
  { name: 'فیزیک', score: 17.9 },
  { name: 'ریاضی', score: 17.2 },
  { name: 'ادبیات فارسی', score: 19.1 },
  { name: 'زبان انگلیسی', score: 17.8 },
  { name: 'دین و زندگی', score: 19.5 },
  { name: 'زبان عربی', score: 18.3 },
];

function levelFor(score) {
  return score >= 18.5 ? 'عالی' : 'خوب';
}

function formatScore(score) {
  return faNum(score.toFixed(1));
}

function familyName(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts[parts.length - 1] || 'کاظمی';
}

function isArian(student) {
  return student.name === 'آرین کاظمی' || String(student.id).includes('arian');
}

function createDossier(student) {
  const arian = isArian(student);
  const ratio = arian ? 1 : Math.max(0.72, Math.min(1.08, (student.percent || 80) / 88));
  const subjects = ARIAN_SUBJECTS.map((item) => {
    const score = arian ? item.score : Math.round(Math.min(20, Math.max(12, item.score * ratio)) * 10) / 10;
    return { name: item.name, score, scoreLabel: formatScore(score), level: levelFor(score) };
  });
  const gpa = arian
    ? 18.7
    : Math.round((subjects.reduce((sum, item) => sum + item.score, 0) / subjects.length) * 10) / 10;
  const last = familyName(student.name);
  const phoneSeed = 1000000 + (student.name.length * 13791);
  const woman = ['سحر محمدی', 'مبینا احمدی', 'فاطمه نادری', 'سارا رضایی'].includes(student.name);
  const grade = student.grade || 'پایه یازدهم';
  const track = student.track || 'تجربی';

  return {
    id: student.id,
    name: student.name,
    grade,
    track,
    status: student.status === 'attention' ? 'attention' : 'active',
    gpaLabel: formatScore(arian ? 18.7 : gpa),
    classRank: faNum(arian ? 4 : (student.rank || Math.max(2, Math.round(12 - ratio * 8)))),
    absenceLabel: arian ? `${faNum(3)} جلسه` : `${faNum(Math.max(0, Math.round((1.15 - ratio) * 8)))} جلسه`,
    nationalRank: faNum(arian ? 823 : Math.round(2400 - ratio * 1500)),
    phone: arian ? '۰۹۱۲۳۴۵۶۷۸۹' : faNum(`0912${String(phoneSeed).slice(0, 7)}`),
    email: arian ? 'arinkazemi@gmail.com' : `${student.id}@desko.demo`,
    address: arian ? 'تهران، منطقه ۲، دبیرستان آینده' : 'تهران، دبیرستان آینده',
    landline: '—',
    father: arian ? 'علی کاظمی' : `علی ${last}`,
    fatherPhone: arian ? '۰۹۱۲۳۴۵۶۷۸۸' : faNum(`0912${String(phoneSeed + 17).slice(0, 7)}`),
    mother: arian ? 'زهرا رضایی' : `زهرا ${last}`,
    motherPhone: arian ? '۰۹۱۲۹۸۷۶۵۴۳' : faNum(`0913${String(phoneSeed + 41).slice(0, 7)}`),
    school: 'دبیرستان آینده',
    year: '۱۴۰۴-۱۴۰۵',
    identity: {
      name: student.name,
      nationalId: arian ? '۴۹۸۷۶۵۴۳۲۱' : faNum(String(1000000000 + student.name.length * 7919).slice(0, 10)),
      birth: arian ? '۱۳۸۷/۰۵/۱۲' : '۱۳۸۶/۰۲/۰۴',
      gender: woman ? 'زن' : 'مرد',
      marital: 'مجرد',
      enrollment: 'با معدل',
    },
    note: arian
      ? 'دانش‌آموزی پرتلاش و منظم است. در دروس تخصصی به ویژه زیست و شیمی عملکرد خوبی دارد. نیاز به تقویت مهارت مدیریت زمان و کاهش استرس در ایام امتحانات دارد.'
      : (student.note || 'پیگیری برنامه هفتگی و مرور درس‌های اصلی در جلسه بعد ادامه پیدا می‌کند.'),
    subjects,
    goals: [
      { id: 'g1', title: arian ? 'افزایش معدل در درس زیست' : 'ثبات در درس‌های اصلی', percent: arian ? 70 : Math.round(ratio * 68), deadline: 'تا پایان ترم', state: 'doing' },
      { id: 'g2', title: 'بهبود مهارت تست‌زنی', percent: arian ? 60 : Math.round(ratio * 54), deadline: 'تا ۴ ماه آینده', state: 'doing' },
      { id: 'g3', title: arian ? 'شرکت در المپیاد زیست' : 'جمع‌بندی آزمون آزمایشی', percent: arian ? 0 : 15, deadline: 'تا ۶ ماه آینده', state: arian ? 'waiting' : 'doing' },
    ],
    records: [
      { id: 't1', title: 'ترم اول ۱۴۰۴', detail: `معدل ${formatScore(arian ? 18.4 : gpa)}` },
      { id: 't2', title: 'ترم دوم ۱۴۰۳', detail: `معدل ${formatScore(arian ? 17.9 : Math.max(14, gpa - 0.4))}` },
      { id: 't3', title: 'ترم اول ۱۴۰۳', detail: `معدل ${formatScore(arian ? 17.2 : Math.max(14, gpa - 0.8))}` },
    ],
    sessions: [
      { id: 's1', title: 'مدیریت استرس', detail: '۱۴۰۴/۰۸/۱۵ · برگزار شده' },
      { id: 's2', title: 'مرور زیست', detail: '۱۴۰۴/۰۸/۰۱ · برگزار شده' },
      { id: 's3', title: 'برنامه‌ریزی درسی', detail: 'چهارشنبه ۲۸ آبان · در انتظار' },
    ],
    reports: [
      { id: 'r1', title: 'گزارش هفتگی مطالعه', detail: arian ? `${faNum(28)} ساعت` : `${faNum(Math.round(ratio * 24))} ساعت` },
      { id: 'r2', title: 'آزمون آزمایشی زیست', detail: arian ? `${faNum(72)}٪` : `${faNum(Math.round(ratio * 70))}٪` },
      { id: 'r3', title: 'حضور کلاس', detail: arian ? `${faNum(96)}٪` : `${faNum(Math.round(88 + ratio * 8))}٪` },
    ],
    notes: [
      { id: 'n1', title: 'یادداشت جلسه آخر', detail: 'تمرکز روی تست‌های زمان‌دار زیست و مرور اشتباهات شیمی.' },
      { id: 'n2', title: 'هماهنگی با والدین', detail: 'خواب شب‌های آزمون کوتاه است. پیگیری ساعت مطالعه در خانه.' },
    ],
    files: [
      { id: 'f1', title: 'کارنامه ترم اول.pdf', detail: 'کارنامه داخلی دبیرستان آینده' },
      { id: 'f2', title: 'برنامه هفتگی.pdf', detail: 'برنامه جاری مشاوره' },
    ],
  };
}

export function resolveDossier(routeId, liveStudents = []) {
  const catalog = [...DESKTOP_STUDENTS, ...MOBILE_STUDENTS];
  const live = liveStudents.find((item) => String(item.user_id) === String(routeId));
  const fromCatalog = catalog.find((item) => item.id === String(routeId))
    || catalog.find((item) => live && item.name === (live.full_name || '').trim());
  const student = fromCatalog || {
    id: String(routeId || 'arian'),
    name: (live?.full_name || '').trim() || (/[\u0600-\u06FF]/.test(String(routeId || '')) ? String(routeId) : 'آرین کاظمی'),
    grade: 'پایه یازدهم',
    track: 'تجربی',
    status: 'active',
    percent: 88,
  };
  return createDossier(student);
}

const LISTS = {
  records: 'records',
  sessions: 'sessions',
  reports: 'reports',
  notes: 'notes',
  files: 'files',
};

const EMPTY_STUDENTS = [];

export function useStudentDossier(routeId, liveStudents) {
  const source = liveStudents ?? EMPTY_STUDENTS;
  const base = useMemo(() => resolveDossier(routeId, source), [routeId, source]);
  const [identity, setIdentity] = useState(base.identity);
  const [note, setNote] = useState(base.note);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setIdentity(base.identity);
    setNote(base.note);
    setTab('overview');
    setEditing(null);
    setDraft(null);
  }, [base]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(id);
  }, [notice]);

  const flash = (text) => setNotice(text);

  const beginEdit = (which) => {
    setEditing(which);
    setDraft(which === 'identity' ? { ...identity } : note);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (editing === 'identity') {
      const name = (draft?.name || '').trim();
      if (!name) {
        flash('نام دانش‌آموز را بنویسید');
        return;
      }
      setIdentity({ ...draft, name });
    } else if (editing === 'note') {
      const text = (draft || '').trim();
      if (!text) {
        flash('متن توضیحات را بنویسید');
        return;
      }
      setNote(text);
    }
    setEditing(null);
    setDraft(null);
    flash('تغییرات روی همین صفحه ذخیره شد');
  };

  const copyPhone = async (value) => {
    const digits = value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    try {
      await navigator.clipboard.writeText(digits);
      flash('شماره کپی شد');
    } catch {
      flash('کپی شماره ممکن نشد');
    }
  };

  return {
    ...base,
    displayName: identity.name,
    identity,
    note,
    tab,
    setTab,
    editing,
    draft,
    setDraft,
    notice,
    beginEdit,
    cancelEdit,
    saveEdit,
    copyPhone,
    list: LISTS[tab] ? base[LISTS[tab]] : [],
  };
}
