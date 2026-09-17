"""ScheduleItem — یک تکه‌ی قابل جای‌گذاری؛ واحد کارِ الگوریتم زمان‌بندی.

سهمیه‌ی هر درس به چند آیتم شکسته می‌شود (مثلاً ۱۸۰ دقیقه ریاضی در سطح عادی → دو
آیتم ۹۰ دقیقه‌ای) و از آن به بعد الگوریتم فقط با آیتم‌ها کار می‌کند، نه با سهمیه.
هر آیتم همه‌ی چیزی را که برای تصمیم‌گیری لازم است با خود دارد: اولویت، شناوری، بار
شناختی و شکل بلوکش.

``item_id`` دترمینیستیک است (نام درس + شماره‌ی ترتیب) تا اجرای دوباره‌ی موتور روی
همان ورودی، همان شناسه‌ها را بسازد و خروجی قابل بازتولید بماند.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import ActivityKind, MAX_PRIORITY, clamp_movability, clamp_priority
from .intensity_profile import BlockShape
from .subject_tag import HEAVY_COGNITIVE_LOAD, SubjectTag


@dataclass(frozen=True)
class ScheduleItem(ValueObject):
    item_id: str
    subject: str
    duration_minutes: int
    shape: BlockShape
    priority: int = 3
    movability: int = 2
    activity: ActivityKind = ActivityKind.STUDY
    tags: frozenset[SubjectTag] = field(default_factory=frozenset)
    cognitive_load: int = 2
    color: str = '#10b981'
    #: محدوده‌ی روزهای مجاز؛ ``None`` یعنی هر روزی از بازه‌ی برنامه.
    earliest_day: JalaliDate | None = None
    latest_day: JalaliDate | None = None

    def __post_init__(self) -> None:
        if self.duration_minutes <= 0:
            raise ValidationError('طول آیتم باید بزرگ‌تر از صفر باشد.')
        object.__setattr__(self, 'priority', clamp_priority(self.priority))
        object.__setattr__(self, 'movability', clamp_movability(self.movability))
        object.__setattr__(self, 'tags', frozenset(self.tags))

    # ---------- ویژگی‌ها ----------

    @property
    def is_heavy(self) -> bool:
        """آیا این آیتم از نوعی است که نباید بی‌فاصله کنار آیتم سنگین دیگری بنشیند؟"""
        return self.cognitive_load >= HEAVY_COGNITIVE_LOAD

    @property
    def is_pinned(self) -> bool:
        """شناوری صفر یعنی موتور حق جابه‌جا کردنش را ندارد."""
        return self.movability == 0

    @property
    def is_critical(self) -> bool:
        return self.priority >= MAX_PRIORITY

    @property
    def min_minutes(self) -> int:
        return min(self.shape.min_block_minutes, self.duration_minutes)

    @property
    def can_shrink(self) -> bool:
        return self.duration_minutes > self.shape.min_block_minutes

    def allows_day(self, date: JalaliDate) -> bool:
        if self.earliest_day is not None and date < self.earliest_day:
            return False
        if self.latest_day is not None and date > self.latest_day:
            return False
        return True

    # ---------- تبدیل‌ها ----------

    def resized_to(self, duration_minutes: int) -> 'ScheduleItem':
        return ScheduleItem(
            item_id=self.item_id,
            subject=self.subject,
            duration_minutes=duration_minutes,
            shape=self.shape,
            priority=self.priority,
            movability=self.movability,
            activity=self.activity,
            tags=self.tags,
            cognitive_load=self.cognitive_load,
            color=self.color,
            earliest_day=self.earliest_day,
            latest_day=self.latest_day,
        )

    def shrunk_to_min(self) -> 'ScheduleItem':
        return self.resized_to(self.shape.min_block_minutes)

    def __str__(self) -> str:
        return f'{self.subject}·{self.duration_minutes}m·P{self.priority}'
