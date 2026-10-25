import { useEffect, useState } from 'react';

export const GROWTH = [
  {
    id: 'sahar',
    name: 'سحر محمدی',
    grade: 'پایه دهم',
    track: 'انسانی',
    delta: 45,
    metric: 'افزایش میانگین نمرات',
  },
  {
    id: 'arian',
    name: 'آرین کاظمی',
    grade: 'پایه یازدهم',
    track: 'ریاضی',
    delta: 38,
    metric: 'افزایش ساعت مطالعه',
  },
];

export const CRITICAL = [
  {
    id: 'negar',
    name: 'نگار رضایی',
    grade: 'پایه دهم',
    track: 'تجربی',
    delta: 32,
    metric: 'کاهش میانگین نمرات',
  },
  {
    id: 'mohammad',
    name: 'محمد محمدی',
    grade: 'پایه یازدهم',
    track: 'ریاضی',
    delta: 28,
    metric: 'کاهش ساعت مطالعه',
  },
];

export const GROUPS = [
  { id: 'attention', label: 'نیازمند توجه', percent: 26, color: '#F0A04B' },
  { id: 'active', label: 'فعال‌ترین‌ها', percent: 47, color: '#3B82F6' },
  { id: 'elite', label: 'نخبه‌ها', percent: 27, color: '#1F9D5A' },
];

export const BALANCE = [
  { id: 'written', label: 'تشریحی', percent: 40, color: '#1F9D5A' },
  { id: 'test', label: 'تستی', percent: 60, color: '#2EAFCA' },
];

/** شنبه سمت راست نمودار است. */
export const TREND = [
  { day: 'جمعه', hours: 32, exams: 18 },
  { day: 'پنجشنبه', hours: 28, exams: 16 },
  { day: 'چهارشنبه', hours: 24, exams: 14 },
  { day: 'سه‌شنبه', hours: 21, exams: 13 },
  { day: 'دوشنبه', hours: 18, exams: 11 },
  { day: 'یکشنبه', hours: 15, exams: 10 },
  { day: 'شنبه', hours: 12, exams: 8 },
];

export const PARENT_REPORTS = [
  { id: 'p1', name: 'سحر محمدی', kind: 'گزارش هفتگی عملکرد', date: '1403/09/23' },
  { id: 'p2', name: 'آرین کاظمی', kind: 'گزارش هفتگی عملکرد', date: '1403/09/23' },
  { id: 'p3', name: 'نگار رضایی', kind: 'گزارش هفتگی عملکرد', date: '1403/09/22' },
  { id: 'p4', name: 'محمد محمدی', kind: 'گزارش هفتگی عملکرد', date: '1403/09/21' },
];

export function useReports() {
  const [chip, setChip] = useState(true);
  const [noted, setNoted] = useState({});
  const [sent, setSent] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const id = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(id);
  }, [notice]);

  const noteMessage = (person, tone) => {
    setNoted((current) => ({ ...current, [person.id]: true }));
    const kind = tone === 'urgent' ? 'فوری' : 'انگیزشی';
    setNotice(`پیام ${kind} برای ${person.name} روی همین صفحه ثبت شد`);
  };

  const sendReport = (row) => {
    setSent((current) => ({ ...current, [row.id]: true }));
    setNotice(`گزارش ${row.name} برای ارسال به والدین علامت خورد`);
  };

  return {
    chip,
    dismissChip: () => setChip(false),
    noted,
    sent,
    notice,
    noteMessage,
    sendReport,
  };
}
