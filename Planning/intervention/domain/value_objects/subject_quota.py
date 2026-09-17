"""SubjectQuota — «چند دقیقه از این درس در این بازه»، پس از حل‌شدن تقاضا.

خروجی مرحله‌ی نرمال‌سازی است: هر ``SubjectDemand`` (چه زمانی، چه تعدادی) اینجا به
دقیقه تبدیل شده و ویژگی‌های زمان‌بندی‌اش (اولویت، شناوری، تگ، بار شناختی) را هم
با خود حمل می‌کند تا موتور برای هر تصمیم مجبور به جست‌وجو در کاتالوگ نباشد.

فیلدهای زمان‌بندی همگی پیش‌فرض دارند، پس ``SubjectQuota(subject=..., minutes=...)``
همچنان معتبر است و کدهای قدیمی نمی‌شکنند.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import (
    ActivityKind,
    DEFAULT_MOVABILITY,
    DEFAULT_PRIORITY,
    clamp_movability,
    clamp_priority,
)
from .subject_profile import MAX_SUBJECT_NAME_LENGTH, SubjectProfile
from .subject_tag import (
    MAX_COGNITIVE_LOAD,
    MIN_COGNITIVE_LOAD,
    SubjectTag,
    default_cognitive_load,
)

MAX_QUOTA_MINUTES = 60 * 200  # سقف عقلانی برای جلوگیری از ورودی اشتباه


@dataclass(frozen=True)
class SubjectQuota(ValueObject):
    subject: str
    minutes: int
    priority: int = DEFAULT_PRIORITY
    movability: int = DEFAULT_MOVABILITY
    activity: ActivityKind = ActivityKind.STUDY
    tags: frozenset[SubjectTag] = field(default_factory=frozenset)
    cognitive_load: int = 0
    #: اگر تقاضا تعدادی بوده (مثلاً ۱۰۰ تست)، عدد اصلی برای نمایش در UI.
    requested_units: int = 0
    #: میزان اتکای تخمین به داده‌ی واقعی همان دانش‌آموز، بین ۰ و ۱.
    estimate_confidence: float = 1.0

    def __post_init__(self) -> None:
        cleaned = (self.subject or '').strip()
        if not cleaned:
            raise ValidationError('نام درس نمی‌تواند خالی باشد.')
        if len(cleaned) > MAX_SUBJECT_NAME_LENGTH:
            raise ValidationError('نام درس بیش از حد بلند است.')
        object.__setattr__(self, 'subject', cleaned)

        if self.minutes <= 0:
            raise ValidationError(
                f'زمان درخواستی برای «{cleaned}» باید بزرگ‌تر از صفر باشد.',
            )
        if self.minutes > MAX_QUOTA_MINUTES:
            raise ValidationError(
                f'زمان درخواستی برای «{cleaned}» غیرواقعی است.',
                meta={'minutes': self.minutes},
            )

        object.__setattr__(self, 'priority', clamp_priority(self.priority))
        object.__setattr__(self, 'movability', clamp_movability(self.movability))
        object.__setattr__(self, 'tags', frozenset(self.tags))
        load = self.cognitive_load or default_cognitive_load(self.tags)
        object.__setattr__(
            self, 'cognitive_load', max(MIN_COGNITIVE_LOAD, min(MAX_COGNITIVE_LOAD, load)),
        )
        object.__setattr__(
            self, 'estimate_confidence', max(0.0, min(1.0, float(self.estimate_confidence))),
        )

    # ---------- تبدیل‌ها ----------

    def with_minutes(self, minutes: int) -> 'SubjectQuota':
        return SubjectQuota(
            subject=self.subject,
            minutes=minutes,
            priority=self.priority,
            movability=self.movability,
            activity=self.activity,
            tags=self.tags,
            cognitive_load=self.cognitive_load,
            requested_units=self.requested_units,
            estimate_confidence=self.estimate_confidence,
        )

    def with_profile(self, profile: SubjectProfile) -> 'SubjectQuota':
        """پر کردن تگ و بار شناختی از کاتالوگ، بدون دست زدن به مقادیر صریح."""
        return SubjectQuota(
            subject=self.subject,
            minutes=self.minutes,
            priority=self.priority,
            movability=self.movability,
            activity=self.activity,
            tags=profile.tags,
            cognitive_load=profile.cognitive_load,
            requested_units=self.requested_units,
            estimate_confidence=self.estimate_confidence,
        )

    @property
    def is_unit_based(self) -> bool:
        return self.requested_units > 0
