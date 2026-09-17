"""PlannedBlock — یک بلوک مطالعاتیِ پیشنهادی که هنوز روی تقویم نیست.

عمداً با ``CalendarEvent`` یکی نشده: بلوک پیشنهادی نه شناسه‌ی رویداد دارد، نه نسخه،
نه مالک؛ فقط «چه درسی، چه روزی، چه ساعتی، با چه اولویتی». تبدیل آن به رویداد فقط
در لحظه‌ی انتشار و در لایه‌ی application رخ می‌دهد.

اولویت و شناوری روی خود بلوک می‌نشینند (نه فقط روی سهمیه) چون پس از انتشار، همین
دو عدد روی رویداد تقویم ذخیره می‌شوند و اجرای بعدیِ موتور بر اساس آن‌ها تصمیم
می‌گیرد کدام بلوک را می‌تواند کنار بزند.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ....shared.domain.value_object import ValueObject
from ..enums import (
    ActivityKind,
    DEFAULT_MOVABILITY,
    DEFAULT_PRIORITY,
    clamp_movability,
    clamp_priority,
)
from .schedule_item import ScheduleItem
from .subject_tag import HEAVY_COGNITIVE_LOAD, SubjectTag, parse_tags

DEFAULT_BLOCK_COLOR = '#10b981'


@dataclass(frozen=True)
class PlannedBlock(ValueObject):
    date: JalaliDate
    slot: TimeRange
    subject: str
    color: str = DEFAULT_BLOCK_COLOR
    priority: int = DEFAULT_PRIORITY
    movability: int = DEFAULT_MOVABILITY
    activity: ActivityKind = ActivityKind.STUDY
    tags: frozenset[SubjectTag] = field(default_factory=frozenset)
    cognitive_load: int = 2
    #: ارجاع به آیتمی که این بلوک از آن ساخته شده — برای جابه‌جایی و صف‌بندی دوباره.
    item_id: str = ''

    def __post_init__(self) -> None:
        object.__setattr__(self, 'priority', clamp_priority(self.priority))
        object.__setattr__(self, 'movability', clamp_movability(self.movability))
        object.__setattr__(self, 'tags', frozenset(self.tags))

    # ---------- ویژگی‌ها ----------

    @property
    def minutes(self) -> int:
        return self.slot.duration_minutes

    @property
    def is_heavy(self) -> bool:
        return self.cognitive_load >= HEAVY_COGNITIVE_LOAD

    @property
    def is_pinned(self) -> bool:
        return self.movability == 0

    @property
    def tag_values(self) -> tuple[str, ...]:
        return tuple(sorted(tag.value for tag in self.tags))

    # ---------- سازنده‌ها ----------

    @classmethod
    def from_item(
        cls, item: ScheduleItem, *, date: JalaliDate, slot: TimeRange, color: str | None = None,
    ) -> 'PlannedBlock':
        return cls(
            date=date,
            slot=slot,
            subject=item.subject,
            color=color or item.color,
            priority=item.priority,
            movability=item.movability,
            activity=item.activity,
            tags=item.tags,
            cognitive_load=item.cognitive_load,
            item_id=item.item_id,
        )

    def moved_to(self, date: JalaliDate, slot: TimeRange) -> 'PlannedBlock':
        return PlannedBlock(
            date=date,
            slot=slot,
            subject=self.subject,
            color=self.color,
            priority=self.priority,
            movability=self.movability,
            activity=self.activity,
            tags=self.tags,
            cognitive_load=self.cognitive_load,
            item_id=self.item_id,
        )

    def __str__(self) -> str:
        return f'{self.subject} {self.date} {self.slot} P{self.priority}'


def block_tags_from_values(values) -> frozenset[SubjectTag]:
    """کمکی برای بازسازی بلوک از JSON ذخیره‌شده (پیشنهادهای معلق)."""
    return parse_tags(values)
