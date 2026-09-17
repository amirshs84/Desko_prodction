"""واژگان کانتکست برنامه‌ریزی و مداخله."""
from __future__ import annotations

from enum import Enum

#: اولویت رویداد در مقیاس ۱ تا ۵. هنگام کمبود زمان، آیتم‌های با اولویت پایین‌تر
#: کوتاه یا حذف می‌شوند تا آیتم‌های ۵ (آزمون، جمع‌بندی) جا شوند.
MIN_PRIORITY = 1
MAX_PRIORITY = 5
DEFAULT_PRIORITY = 3

#: شناوری: چقدر یک بلوک می‌تواند در طول روز یا هفته جابه‌جا شود. صفر یعنی «میخ‌شده»
#: و ۴ یعنی «هرجا که لازم شد ببرش». فقط بلوک‌های شناور کاندیدِ جابه‌جایی اجباری‌اند.
MIN_MOVABILITY = 0
MAX_MOVABILITY = 4
DEFAULT_MOVABILITY = 2
PINNED_MOVABILITY = 0


class IntensityLevel(str, Enum):
    """سطح فشردگی برنامه.

    طول بلوک و فاصله‌ی استراحت را تعیین می‌کند، اما نه به‌صورت یک عدد ثابت: نگاشت
    در ``IntensityProfile`` است و به‌ازای هر تگ درس مقدار جداگانه دارد.
    """

    LIGHT = 'light'
    NORMAL = 'normal'
    HEAVY = 'heavy'


class ActivityKind(str, Enum):
    """جنس کاری که در یک بلوک انجام می‌شود.

    مقادیر عمداً با ``StudySession.MODE_CHOICES`` یکی است تا تخمین‌گر حجم کار
    بتواند نرخ واقعی دانش‌آموز را مستقیم از همان جلسات بخواند.
    """

    STUDY = 'study'
    TEST = 'test'
    SOLVE = 'solve'
    REVIEW = 'review'
    HOMEWORK = 'homework'

    @property
    def is_countable(self) -> bool:
        """آیا برای این فعالیت «تعداد» معنا دارد (مثل ۱۰۰ تست یا ۳۰ سؤال)؟"""
        return self in (ActivityKind.TEST, ActivityKind.SOLVE)


class DemandUnit(str, Enum):
    """واحد تقاضای مشاور: «۸ ساعت ریاضی» یا «۱۰۰ تست ریاضی»."""

    MINUTES = 'minutes'
    COUNT = 'count'


class PlanMode(str, Enum):
    """استراتژی انتشار برنامه‌ی گروهی.

    ``SUGGESTED``: برنامه به‌عنوان پیش‌نویس برای دانش‌آموز می‌رود و تا تأیید او روی
    تقویم نمی‌نشیند. ``FORCED``: بی‌درنگ روی تقویم اعمال می‌شود.
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
    #: آیتمی که حتی پس از کوتاه‌سازی و جابه‌جایی اجباری جا نشد.
    UNPLACEABLE_ITEM = 'UNPLACEABLE_ITEM'
    #: بلوکی با اولویت پایین‌تر برای باز کردن جا برای اولویت بالاتر جابه‌جا شد.
    EVICTED_BY_PRIORITY = 'EVICTED_BY_PRIORITY'
    #: آیتم برای جا شدن کوتاه شد (هنوز بالای حداقل طول بلوک است).
    ITEM_SHRUNK = 'ITEM_SHRUNK'
    #: تخمین «تعداد → دقیقه» به prior تکیه کرده چون سابقه‌ی کافی نبود.
    LOW_CONFIDENCE_ESTIMATE = 'LOW_CONFIDENCE_ESTIMATE'


def clamp_priority(value: int | None) -> int:
    if value is None:
        return DEFAULT_PRIORITY
    return max(MIN_PRIORITY, min(MAX_PRIORITY, int(value)))


def clamp_movability(value: int | None) -> int:
    if value is None:
        return DEFAULT_MOVABILITY
    return max(MIN_MOVABILITY, min(MAX_MOVABILITY, int(value)))
