"""مرزهای روز تقویم ایران — تنها منبع حقیقت برای پنجره‌های گزارش پیشرفت.

پنل دانش‌آموز اعداد را کلاینت‌ساید با ``Asia/Tehran`` می‌سازد. اگر سرور با UTC
نیمه‌شب ببرد، همان جلسه‌ی ۲۳:۳۰ تهران ممکن است در «امروز» دانش‌آموز باشد و در
«دیروز» گزارش مدیر. همه‌ی پنجره‌های today/week/month/heatmap از اینجا می‌آیند.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo('Asia/Tehran')

# هم‌خوان با فیلترهای تب daily/weekly/monthly در Dashboard.jsx
WEEK_LOOKBACK_DAYS = 7
MONTH_LOOKBACK_DAYS = 30
# هم‌خوان با heatmap نودروزه‌ی پنل دانش‌آموز
DEFAULT_HEATMAP_DAYS = 90


@dataclass(frozen=True)
class ReportWindows:
    """لحظه‌ی «الان» و ابتدای پنجره‌های گزارش، همگی timezone-aware در تهران."""

    now: datetime
    today_start: datetime
    week_start: datetime
    month_start: datetime
    heatmap_start: datetime
    today: date

    @classmethod
    def at(cls, moment: datetime, *, heatmap_days: int = DEFAULT_HEATMAP_DAYS) -> 'ReportWindows':
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=IRAN_TZ)
        else:
            moment = moment.astimezone(IRAN_TZ)
        today_start = moment.replace(hour=0, minute=0, second=0, microsecond=0)
        return cls(
            now=moment,
            today_start=today_start,
            week_start=today_start - timedelta(days=WEEK_LOOKBACK_DAYS),
            month_start=today_start - timedelta(days=MONTH_LOOKBACK_DAYS),
            heatmap_start=today_start - timedelta(days=heatmap_days - 1),
            today=today_start.date(),
        )


def iran_date_key(moment: datetime) -> str:
    """کلید روز برای heatmap: ``YYYY-MM-DD`` بر اساس تقویم تهران."""
    return to_iran(moment).date().isoformat()


def to_iran(moment: datetime) -> datetime:
    """``datetime`` را timezone-aware در تهران می‌کند."""
    if moment.tzinfo is None:
        return moment.replace(tzinfo=IRAN_TZ)
    return moment.astimezone(IRAN_TZ)


def iran_day_bounds(day: date) -> tuple[datetime, datetime]:
    """بازه نیم‌باز ``[00:00, فردا 00:00)`` همان روز تقویم تهران."""
    start = datetime(day.year, day.month, day.day, tzinfo=IRAN_TZ)
    return start, start + timedelta(days=1)
