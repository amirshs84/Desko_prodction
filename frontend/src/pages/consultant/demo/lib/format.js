import jalaali from 'jalaali-js';

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export function faNum(value) {
  return String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function formatConsultantNow(date = new Date()) {
  const { jy, jm, jd } = jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const weekday = WEEKDAYS[date.getDay()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return {
    weekday,
    dayMonth: `${weekday} ${faNum(jd)} ${MONTHS[jm - 1]}`,
    full: `${weekday} ${faNum(jd)} ${MONTHS[jm - 1]} ${faNum(jy)}`,
    time: faNum(`${hours}:${minutes}`),
  };
}

export function consultantIdentity() {
  try {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const full = (profile.full_name || '').trim() || 'رویا احمدی';
    const first = full.split(/\s+/)[0] || 'رویا';
    return { full, first, role: 'مشاور تحصیلی' };
  } catch {
    return { full: 'رویا احمدی', first: 'رویا', role: 'مشاور تحصیلی' };
  }
}
