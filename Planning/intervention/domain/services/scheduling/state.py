"""ScheduleState — وضعیت جاری چیدمان یک دانش‌آموز و نگهبان قیدهای سخت.

دو جنس اشغال داریم و تفاوتشان قلب این طراحی است:

  • **دیوار** (``wall``): رویداد ثابت مدرسه، و هر رویدادی که دانش‌آموز یا مشاور با
    دست ساخته. موتور تحت هیچ شرایطی به آن‌ها دست نمی‌زند و فقط دورشان می‌چیند.
  • **جایگاه** (``Placement``): بلوکی که موتور گذاشته — چه در همین اجرا، چه در
    اجراهای قبلی. این‌ها بسته به شناوری و اولویتشان قابل جابه‌جایی‌اند.

قیدهای سخت اینجا زندگی می‌کنند (تداخل، پنجره‌ی فعال، سقف فرسودگی، حداقل استراحت)
و تابع هزینه هیچ‌وقت آن‌ها را نمی‌بیند؛ چیزی که اینجا رد شود اصلاً کاندید نمی‌شود.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace
from typing import Iterable, Mapping, Sequence

from .....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from .....scheduling.domain.services.free_slot_finder import free_gaps, merge_ranges
from .....scheduling.domain.value_objects.jalali_date import JalaliDate
from .....scheduling.domain.value_objects.time_range import TimeRange
from ...ports.burnout_policy import BurnoutPolicy
from ...value_objects.schedule_item import ScheduleItem


@dataclass(frozen=True)
class Placement:
    """یک آیتم که روی روز و ساعت مشخصی نشسته است."""

    item: ScheduleItem
    date: JalaliDate
    slot: TimeRange
    #: اگر این جایگاه از یک رویداد موجودِ تقویم آمده، شناسه‌اش؛ وگرنه خالی.
    existing_client_id: str = ''
    #: موقعیت اولیه‌ی همان رویداد موجود — برای تشخیص «جابه‌جا شد یا نه».
    origin_date: JalaliDate | None = None
    origin_slot: TimeRange | None = None

    @property
    def is_existing(self) -> bool:
        return bool(self.existing_client_id)

    @property
    def has_moved(self) -> bool:
        if not self.is_existing:
            return False
        return self.date != self.origin_date or self.slot != self.origin_slot

    @property
    def minutes(self) -> int:
        return self.slot.duration_minutes

    @property
    def end_with_break(self) -> int:
        return self.slot.end_minutes + self.item.shape.break_minutes

    def moved_to(self, date: JalaliDate, slot: TimeRange) -> 'Placement':
        return replace(self, date=date, slot=slot)


class ScheduleState:
    """چیدمان قابل تغییر؛ عمداً mutable است چون سازنده و پالایشگر هزاران بار
    روی آن place/unplace می‌زنند و کپی‌برداری کامل، الگوریتم را کند می‌کرد."""

    def __init__(
        self,
        *,
        days: Sequence[JalaliDate],
        walls: Mapping[JalaliDate, Sequence[TimeRange]],
        policy: AwakeWindowPolicy,
        burnout: BurnoutPolicy,
    ) -> None:
        self.days: tuple[JalaliDate, ...] = tuple(days)
        self.policy = policy
        self._burnout = burnout
        self._walls: dict[JalaliDate, list[TimeRange]] = {
            day: merge_ranges(walls.get(day, ())) for day in self.days
        }
        self._by_date: dict[JalaliDate, list[Placement]] = {day: [] for day in self.days}
        self._by_item: dict[str, Placement] = {}
        self._daily_subject_minutes: dict[tuple[JalaliDate, str], int] = defaultdict(int)

    # ---------- خواندن ----------

    @property
    def placements(self) -> tuple[Placement, ...]:
        return tuple(self._by_item.values())

    def placements_on(self, date: JalaliDate) -> list[Placement]:
        """جایگاه‌های یک روز، به ترتیب زمانی."""
        return sorted(self._by_date.get(date, ()), key=lambda p: p.slot.start_minutes)

    def placement_of(self, item_id: str) -> Placement | None:
        return self._by_item.get(item_id)

    def is_placed(self, item_id: str) -> bool:
        return item_id in self._by_item

    def busy_ranges(self, date: JalaliDate, *, exclude_item_id: str = '') -> list[TimeRange]:
        occupied = list(self._walls.get(date, ()))
        for placement in self._by_date.get(date, ()):
            if placement.item.item_id == exclude_item_id:
                continue
            occupied.append(placement.slot)
        return merge_ranges(occupied)

    def gaps(
        self, date: JalaliDate, *, min_duration: int = 1, exclude_item_id: str = '',
    ) -> list[TimeRange]:
        return free_gaps(
            self.policy.window,
            self.busy_ranges(date, exclude_item_id=exclude_item_id),
            min_duration=min_duration,
        )

    def wall_gaps(self, date: JalaliDate, *, min_duration: int = 1) -> list[TimeRange]:
        """شکاف‌ها با نادیده گرفتن جایگاه‌ها — «اگر همه‌چیز را برداریم کجا جا هست».

        مبنای مرحله‌ی جابه‌جایی اجباری است: اول جای فیزیکیِ ممکن پیدا می‌شود، بعد
        بررسی می‌شود چه کسی آنجا نشسته و آیا کنار می‌رود یا نه.
        """
        return free_gaps(
            self.policy.window, self._walls.get(date, ()), min_duration=min_duration,
        )

    def blockers(
        self, date: JalaliDate, slot: TimeRange, item: ScheduleItem, *, exclude_item_id: str = '',
    ) -> list[Placement]:
        """جایگاه‌هایی که مانع نشستن این آیتم اینجا هستند (تداخل یا استراحت ناکافی)."""
        found: list[Placement] = []
        for other in self._by_date.get(date, ()):
            if other.item.item_id == exclude_item_id:
                continue
            if other.slot.overlaps(slot) or not _respects_min_break(other, item, slot):
                found.append(other)
        return found

    def hits_wall(self, date: JalaliDate, slot: TimeRange) -> bool:
        return any(wall.overlaps(slot) for wall in self._walls.get(date, ()))

    def daily_minutes(self, date: JalaliDate, subject: str) -> int:
        return self._daily_subject_minutes[(date, subject)]

    def day_load_minutes(self, date: JalaliDate) -> int:
        return sum(placement.minutes for placement in self._by_date.get(date, ()))

    # ---------- قیدهای سخت ----------

    def fits(
        self,
        item: ScheduleItem,
        date: JalaliDate,
        slot: TimeRange,
        *,
        exclude_item_id: str = '',
    ) -> bool:
        """آیا این آیتم می‌تواند اینجا بنشیند بدون نقض هیچ قید سختی؟"""
        if date not in self._by_date or not item.allows_day(date):
            return False
        if not self.policy.contains(slot):
            return False
        if not self._respects_burnout(item, date, slot.duration_minutes, exclude_item_id):
            return False
        return self._is_clear(date, slot, item, exclude_item_id=exclude_item_id)

    def _is_clear(
        self,
        date: JalaliDate,
        slot: TimeRange,
        item: ScheduleItem,
        *,
        exclude_item_id: str,
    ) -> bool:
        for wall in self._walls.get(date, ()):
            if wall.overlaps(slot):
                return False
        for other in self._by_date.get(date, ()):
            if other.item.item_id == exclude_item_id:
                continue
            if other.slot.overlaps(slot):
                return False
            if not _respects_min_break(other, item, slot):
                return False
        return True

    def _respects_burnout(
        self, item: ScheduleItem, date: JalaliDate, minutes: int, exclude_item_id: str,
    ) -> bool:
        ceiling = self._burnout.max_daily_minutes(item.subject)
        if ceiling is None:
            return True
        used = self.daily_minutes(date, item.subject)
        existing = self._by_item.get(exclude_item_id)
        if existing is not None and existing.date == date and existing.item.subject == item.subject:
            used -= existing.minutes
        return used + minutes <= ceiling

    # ---------- نوشتن ----------

    def place(self, placement: Placement) -> None:
        item_id = placement.item.item_id
        if item_id in self._by_item:
            raise ValueError(f'آیتم «{item_id}» از قبل جای‌گذاری شده است.')
        self._by_item[item_id] = placement
        self._by_date[placement.date].append(placement)
        self._daily_subject_minutes[
            (placement.date, placement.item.subject)
        ] += placement.minutes

    def unplace(self, item_id: str) -> Placement | None:
        placement = self._by_item.pop(item_id, None)
        if placement is None:
            return None
        self._by_date[placement.date] = [
            other for other in self._by_date[placement.date]
            if other.item.item_id != item_id
        ]
        key = (placement.date, placement.item.subject)
        self._daily_subject_minutes[key] -= placement.minutes
        if self._daily_subject_minutes[key] <= 0:
            self._daily_subject_minutes.pop(key, None)
        return placement

    def relocate(self, item_id: str, date: JalaliDate, slot: TimeRange) -> None:
        placement = self.unplace(item_id)
        if placement is None:
            raise ValueError(f'آیتم «{item_id}» جای‌گذاری نشده است.')
        self.place(placement.moved_to(date, slot))

    # ---------- بازگردانی (برای جابه‌جایی اجباریِ ناموفق) ----------

    def snapshot(self) -> tuple[Placement, ...]:
        return tuple(self._by_item.values())

    def restore(self, placements: Sequence[Placement]) -> None:
        self._by_item.clear()
        self._daily_subject_minutes.clear()
        for day in self.days:
            self._by_date[day] = []
        for placement in placements:
            self.place(placement)

    # ---------- گزارش ----------

    def capacity_minutes(self, default_shape_minutes: int, break_minutes: int) -> int:
        """ظرفیت واقعی: شبیه‌سازی پر کردن شکاف‌های خالیِ دیوارها با بلوک و استراحت.

        فقط دیوارها لحاظ می‌شوند نه جایگاه‌ها، چون این عدد «حداکثر کاری که در این
        بازه ممکن بود» را می‌سنجد، نه «چقدر الان خالی مانده».
        """
        total = 0
        for day in self.days:
            for gap in free_gaps(
                self.policy.window, self._walls.get(day, ()), min_duration=1,
            ):
                cursor = gap.start_minutes
                while cursor < gap.end_minutes:
                    duration = min(default_shape_minutes, gap.end_minutes - cursor)
                    if duration < min(default_shape_minutes, 30):
                        break
                    total += duration
                    cursor += duration + break_minutes
        return total


def _respects_min_break(
    other: Placement, item: ScheduleItem, slot: TimeRange,
) -> bool:
    """حداقل استراحت بین دو بلوک مطالعه — قید سخت.

    فاصله‌ی لازم از شکل بلوکی می‌آید که زودتر تمام می‌شود؛ یعنی بعد از یک بلوک
    تحلیلیِ ۹۰ دقیقه‌ای نمی‌توان بی‌فاصله بلوک بعدی را چسباند، حتی اگر جا باشد.
    """
    if other.slot.end_minutes <= slot.start_minutes:
        return slot.start_minutes - other.slot.end_minutes >= other.item.shape.break_minutes
    if slot.end_minutes <= other.slot.start_minutes:
        return other.slot.start_minutes - slot.end_minutes >= item.shape.break_minutes
    return False


def walls_from_ranges(
    days: Sequence[JalaliDate], ranges_by_date: Mapping[JalaliDate, Iterable[TimeRange]],
) -> dict[JalaliDate, list[TimeRange]]:
    return {day: list(ranges_by_date.get(day, ())) for day in days}
