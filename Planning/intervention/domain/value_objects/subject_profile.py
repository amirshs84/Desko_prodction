"""SubjectProfile — یک ردیف از کاتالوگ درس‌های مدرسه.

درس‌ها در ماژول برنامه‌ریزی همچنان با «نام» شناخته می‌شوند (نه FK)، ولی هر نام
می‌تواند یک پروفایل در سطح مدرسه داشته باشد که تگ‌ها، بار شناختی و مقادیر پیش‌فرض
اولویت و شناوری را نگه می‌دارد. مشاور یک‌بار آن را تنظیم می‌کند و همه‌ی برنامه‌ها
از آن ارث می‌برند.

درسی که در کاتالوگ نیست خطا نمی‌دهد؛ ``SubjectProfile.fallback`` یک پروفایل خنثی
می‌سازد تا موتور دقیقاً مثل قبل از وجود کاتالوگ کار کند.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import (
    DEFAULT_MOVABILITY,
    DEFAULT_PRIORITY,
    clamp_movability,
    clamp_priority,
)
from .subject_tag import (
    MAX_COGNITIVE_LOAD,
    MIN_COGNITIVE_LOAD,
    SubjectTag,
    default_cognitive_load,
)

MAX_SUBJECT_NAME_LENGTH = 100


@dataclass(frozen=True)
class SubjectProfile(ValueObject):
    name: str
    tags: frozenset[SubjectTag] = field(default_factory=frozenset)
    cognitive_load: int = 0
    default_priority: int = DEFAULT_PRIORITY
    default_movability: int = DEFAULT_MOVABILITY

    def __post_init__(self) -> None:
        cleaned = (self.name or '').strip()
        if not cleaned:
            raise ValidationError('نام درس نمی‌تواند خالی باشد.')
        if len(cleaned) > MAX_SUBJECT_NAME_LENGTH:
            raise ValidationError('نام درس بیش از حد بلند است.')
        object.__setattr__(self, 'name', cleaned)
        object.__setattr__(self, 'tags', frozenset(self.tags))
        # صفر یعنی «تعیین نشده» و از تگ‌ها استنتاج می‌شود.
        load = self.cognitive_load or default_cognitive_load(self.tags)
        object.__setattr__(
            self, 'cognitive_load', max(MIN_COGNITIVE_LOAD, min(MAX_COGNITIVE_LOAD, load)),
        )
        object.__setattr__(self, 'default_priority', clamp_priority(self.default_priority))
        object.__setattr__(self, 'default_movability', clamp_movability(self.default_movability))

    @classmethod
    def fallback(cls, name: str) -> 'SubjectProfile':
        """پروفایل خنثی برای درسی که در کاتالوگ مدرسه ثبت نشده."""
        return cls(name=name)

    @property
    def is_analytical(self) -> bool:
        return SubjectTag.ANALYTICAL in self.tags

    @property
    def is_memorization(self) -> bool:
        return SubjectTag.MEMORIZATION in self.tags

    @property
    def tag_values(self) -> tuple[str, ...]:
        return tuple(sorted(tag.value for tag in self.tags))
