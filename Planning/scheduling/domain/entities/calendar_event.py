"""CalendarEvent — موجودیت مرکزی کانتکست تقویم.

اینجا تنها جایی است که قواعد «چه کسی حق تغییر چه رویدادی را دارد» زندگی می‌کند.
هیچ ارجاعی به Django، DRF یا دیتابیس در این فایل نیست؛ به همین دلیل قواعد را
می‌توان بدون راه‌اندازی دیتابیس تست کرد و موتور برنامه‌ریزی هم می‌تواند نسخه‌ی
درون‌حافظه‌ای همین موجودیت‌ها را برای پیش‌نمایش بسازد.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ....shared.domain.entity import Entity
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import ImmutableEventViolationError, ValidationError
from ..enums import EventKind, EventOrigin
from ..value_objects.event_ref import EventRef
from ..value_objects.jalali_date import JalaliDate
from ..value_objects.time_range import TimeRange

DEFAULT_EVENT_COLOR = '#10b981'
MAX_TITLE_LENGTH = 300

_ORIGIN_BY_AUTHORITY = {
    WriteAuthority.STUDENT: EventOrigin.STUDENT,
    WriteAuthority.CONSULTANT: EventOrigin.CONSULTANT,
    WriteAuthority.ALGORITHM: EventOrigin.ALGORITHM,
    WriteAuthority.SCHOOL_MANAGER: EventOrigin.SCHOOL,
}


@dataclass(eq=False)
class CalendarEvent(Entity):
    """یک رویداد روی تقویم یک دانش‌آموز.

    ``version`` برای کنترل همزمانی خوش‌بینانه است (اگر همان رویداد در تب دیگری
    جابه‌جا شده باشد، ذخیره‌ی این نسخه رد می‌شود). این با Snapshot Versioning سند
    اشتباه نشود؛ آن یکی نسخه‌گیری از «کل تقویم» هنگام انتشار است.
    """

    id: EventRef
    date: JalaliDate
    slot: TimeRange
    title: str
    description: str = ''
    color: str = DEFAULT_EVENT_COLOR
    all_day: bool = False
    kind: EventKind = EventKind.MUTABLE
    origin: EventOrigin = EventOrigin.STUDENT
    group_id: str = ''
    version: int = 1
    created_at: datetime | None = None
    #: نسخه‌ای که در آخرین همگام‌سازی با دیتابیس دیده شده (``None`` = ذخیره‌نشده).
    #: مخزن با مقایسه‌ی همین مقدار، نوشتن روی نسخه‌ی کهنه را رد می‌کند.
    persisted_version: int | None = None

    # ---------- ساخت ----------

    @classmethod
    def create(
        cls,
        *,
        ref: EventRef,
        date: JalaliDate,
        slot: TimeRange,
        title: str,
        authority: WriteAuthority,
        kind: EventKind = EventKind.MUTABLE,
        description: str = '',
        color: str = DEFAULT_EVENT_COLOR,
        all_day: bool = False,
        group_id: str = '',
    ) -> 'CalendarEvent':
        if kind is EventKind.IMMUTABLE and authority is not WriteAuthority.SCHOOL_MANAGER:
            raise ImmutableEventViolationError(
                'فقط مدیر مدرسه می‌تواند رویداد ثابت ایجاد کند.',
                meta={'authority': authority.value},
            )
        return cls(
            id=ref,
            date=date,
            slot=TimeRange.full_day() if all_day else slot,
            title=_clean_title(title),
            description=description or '',
            color=color or DEFAULT_EVENT_COLOR,
            all_day=all_day,
            kind=kind,
            origin=_ORIGIN_BY_AUTHORITY[authority],
            group_id=group_id or '',
        )

    # ---------- شناسه ----------

    @property
    def owner_id(self) -> int:
        return self.id.owner_id

    @property
    def client_id(self) -> str:
        return self.id.client_id

    @property
    def is_immutable(self) -> bool:
        return self.kind is EventKind.IMMUTABLE

    # ---------- قواعد نوشتن ----------

    def ensure_writable_by(self, authority: WriteAuthority) -> None:
        """قانون دامنه: رویداد ثابت فقط در اختیار مدیر مدرسه است.

        این تنها دروازه‌ی تغییر است؛ هر use-case دیگری (درگ‌ودراپ مشاور، اعمال
        قطعی موتور برنامه‌ریزی، ویرایش دانش‌آموز) پیش از تغییر باید از آن بگذرد.
        """
        if self.is_immutable and authority is not WriteAuthority.SCHOOL_MANAGER:
            raise ImmutableEventViolationError(
                meta={'client_id': self.client_id, 'authority': authority.value},
            )

    def move_to(self, date: JalaliDate, slot: TimeRange, *, authority: WriteAuthority) -> None:
        """جابه‌جایی رویداد به روز/بازه‌ی دیگر (مسیر درگ‌ودراپ)."""
        self.apply_patch(authority=authority, date=date, slot=slot)

    def apply_patch(
        self,
        *,
        authority: WriteAuthority,
        date: JalaliDate | None = None,
        slot: TimeRange | None = None,
        title: str | None = None,
        description: str | None = None,
        color: str | None = None,
        all_day: bool | None = None,
    ) -> None:
        """اعمال یک تغییر جزئی؛ ``None`` یعنی «دست نزن». یک‌بار نسخه را بالا می‌برد."""
        self.ensure_writable_by(authority)
        if date is not None:
            self.date = date
        if title is not None:
            self.title = _clean_title(title)
        if description is not None:
            self.description = description
        if color is not None:
            self.color = color or DEFAULT_EVENT_COLOR
        if all_day is not None:
            self.all_day = all_day
        # رویداد تمام‌روز همیشه کل شبانه‌روز را می‌گیرد؛ بازه‌ی ارسالی نادیده می‌رود.
        if self.all_day:
            self.slot = TimeRange.full_day()
        elif slot is not None:
            self.slot = slot
        self.version += 1

    def overlaps(self, other: 'CalendarEvent') -> bool:
        return self.date == other.date and self.slot.overlaps(other.slot)


def _clean_title(title: str) -> str:
    cleaned = (title or '').strip()
    if not cleaned:
        raise ValidationError('عنوان رویداد نمی‌تواند خالی باشد.')
    if len(cleaned) > MAX_TITLE_LENGTH:
        raise ValidationError(f'عنوان رویداد نباید بیش از {MAX_TITLE_LENGTH} نویسه باشد.')
    return cleaned
