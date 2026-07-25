"""واژگان کانتکست برنامه‌ریزی و مداخله."""
from __future__ import annotations

from enum import Enum


class IntensityLevel(str, Enum):
    """سطح فشردگی برنامه.

    در MVP فقط طول بلوک و فاصله‌ی استراحت را تنظیم می‌کند (``BreakPolicy``)؛ همین
    پارامتر بعداً می‌تواند ورودی الگوریتم‌های پیچیده‌تر باشد بدون تغییر قرارداد.
    """

    LIGHT = 'light'
    NORMAL = 'normal'
    HEAVY = 'heavy'


class PlanMode(str, Enum):
    """استراتژی انتشار برنامه‌ی گروهی.

    ``SUGGESTED``: برنامه به‌عنوان پیش‌نویس برای دانش‌آموز می‌رود و تا تأیید او روی
    تقویم نمی‌نشیند. ``FORCED``: بی‌درنگ روی تقویم اعمال می‌شود، اما فقط در فضاهای
    خالی؛ هیچ رویدادی — ثابت یا غیر ثابت — بازنویسی نمی‌شود.
    """

    SUGGESTED = 'suggested'
    FORCED = 'forced'


class ProposalStatus(str, Enum):
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    REJECTED = 'rejected'


class PlanWarningCode:
    """کدهای ماشین‌خوان هشدارهای پیش‌نمایش."""

    CAPACITY_SHORTFALL = 'CAPACITY_SHORTFALL'
    SUBJECT_SHORTFALL = 'SUBJECT_SHORTFALL'
    BURNOUT_CAP = 'BURNOUT_CAP'
    NO_FREE_SPACE = 'NO_FREE_SPACE'
