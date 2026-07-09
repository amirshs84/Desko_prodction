"""ابزار تاریخ شمسی برای برچسب‌های نمودار و مرز روز در ایران."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

IRAN_TZ = ZoneInfo('Asia/Tehran')

PERSIAN_MONTHS = [
    '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]


def gregorian_to_jalali(gy, gm, gd):
    """تبدیل میلادی به شمسی — الگوریتم استاندارد."""
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    if gy > 1600:
        jy = 979
        gy -= 1600
    else:
        jy = 0
        gy -= 621
    gy2 = gy + 1 if gm > 2 else gy
    days = (
        365 * gy
        + (gy2 + 3) // 4
        - (gy2 + 99) // 100
        + (gy2 + 399) // 400
        - 80
        + gd
        + g_d_m[gm - 1]
    )
    jy += 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30
    return jy, jm, jd


def jalali_label(d: date, short_month: bool = False) -> str:
    """برچسب شمسی مثل «۱۸ تیر»."""
    _, jm, jd = gregorian_to_jalali(d.year, d.month, d.day)
    month_name = PERSIAN_MONTHS[jm] if 1 <= jm <= 12 else ''
    if short_month and month_name:
        month_name = month_name[:3]
    return f'{jd} {month_name}'.strip()


def iran_today() -> date:
    """تاریخ امروز بر اساس منطقه زمانی ایران."""
    return timezone.localdate()


def make_iran_day_start(d: date) -> datetime:
    """ابتدای روز در منطقه زمانی ایران (aware datetime)."""
    return timezone.make_aware(datetime.combine(d, time.min), IRAN_TZ)


def build_attendance_trend_30d(day_map, total_students, end_date=None):
    """
    ساخت روند ۳۰ روزه با برچسب شمسی.
    day_map: dict با کلید ISO میلادی (YYYY-MM-DD) و مقدار تعداد فعال.
    """
    if end_date is None:
        end_date = iran_today()
    trend = []
    for i in range(29, -1, -1):
        day_dt = end_date - timedelta(days=i)
        key = day_dt.isoformat()
        active = day_map.get(key, 0)
        value = round((active / total_students) * 100) if total_students else 0
        trend.append({
            'date': jalali_label(day_dt),
            'value': value,
            'iso': key,
        })
    return trend
