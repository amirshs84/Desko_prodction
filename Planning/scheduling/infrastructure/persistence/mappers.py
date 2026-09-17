"""نگاشت دوطرفه بین موجودیت‌های دامنه و مدل‌های Django.

این ماژول تنها جایی است که «شکل دیتابیس» به «شکل دامنه» ترجمه می‌شود. با تمرکز
نگاشت در اینجا، ORM از دامنه بیرون درز نمی‌کند و تغییر شِمای دیتابیس، دامنه را
نمی‌شکند (فقط mapper به‌روز می‌شود).

همچنین همگام‌سازی ستون ``date`` (آینه‌ی میلادی روز شمسی) فقط اینجا انجام می‌شود؛
پس هیچ مسیر نوشتنی نمی‌تواند این دو را ناهمگام رها کند.
"""
from __future__ import annotations

from ...domain.entities.calendar_event import CalendarEvent
from ...domain.enums import EventKind, EventOrigin
from ...domain.value_objects.event_ref import EventRef
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange
from . import models as m


class CalendarEventMapper:
    @staticmethod
    def to_entity(row: m.CalendarEventModel) -> CalendarEvent:
        return CalendarEvent(
            id=EventRef(owner_id=row.user_id, client_id=row.client_id),
            date=JalaliDate(row.jy, row.jm, row.jd),
            slot=TimeRange(row.start_minutes, row.end_minutes),
            title=row.title,
            description=row.description,
            color=row.color,
            all_day=row.all_day,
            kind=EventKind(row.kind),
            origin=EventOrigin(row.origin),
            group_id=row.group_id,
            version=row.version,
            priority=row.priority,
            movability=row.movability,
            subject_tags=tuple(row.subject_tags or ()),
            cognitive_load=row.cognitive_load,
            created_at=row.created_at,
            persisted_version=row.version,
        )

    @staticmethod
    def to_model(entity: CalendarEvent) -> m.CalendarEventModel:
        row = m.CalendarEventModel(
            user_id=entity.owner_id,
            client_id=entity.client_id,
        )
        CalendarEventMapper.apply_to_model(entity, row)
        return row

    @staticmethod
    def apply_to_model(entity: CalendarEvent, row: m.CalendarEventModel) -> None:
        """نوشتن وضعیت موجودیت روی یک ردیف موجود (برای update)."""
        row.jy = entity.date.jy
        row.jm = entity.date.jm
        row.jd = entity.date.jd
        row.date = entity.date.to_gregorian()
        row.title = entity.title
        row.description = entity.description
        row.start_minutes = entity.slot.start_minutes
        row.end_minutes = entity.slot.end_minutes
        row.color = entity.color
        row.all_day = entity.all_day
        row.kind = entity.kind.value
        row.origin = entity.origin.value
        row.group_id = entity.group_id
        row.version = entity.version
        row.priority = entity.priority
        row.movability = entity.movability
        row.subject_tags = list(entity.subject_tags)
        row.cognitive_load = entity.cognitive_load

    #: ستون‌هایی که در به‌روزرسانی نوشته می‌شوند (ورودی ``bulk_update``/``update``).
    MUTABLE_COLUMNS = (
        'jy', 'jm', 'jd', 'date', 'title', 'description',
        'start_minutes', 'end_minutes', 'color', 'all_day',
        'kind', 'origin', 'group_id', 'version',
        'priority', 'movability', 'subject_tags', 'cognitive_load',
    )


class SnapshotPayloadMapper:
    """نگاشت رویداد ↔ دیکشنری JSON داخل اسنپ‌شات.

    این قالب یک «فرمت ذخیره‌سازی» است و نباید با قرارداد API اشتباه شود؛ عمداً از
    سریالایزرهای REST جدا نگه داشته شده تا تغییر شکل پاسخ HTTP، اسنپ‌شات‌های قدیمی
    را غیرقابل بازگردانی نکند.
    """

    @staticmethod
    def dump(event: CalendarEvent) -> dict:
        return {
            'client_id': event.client_id,
            'jy': event.date.jy,
            'jm': event.date.jm,
            'jd': event.date.jd,
            'start_minutes': event.slot.start_minutes,
            'end_minutes': event.slot.end_minutes,
            'title': event.title,
            'description': event.description,
            'color': event.color,
            'all_day': event.all_day,
            'kind': event.kind.value,
            'origin': event.origin.value,
            'group_id': event.group_id,
            'version': event.version,
            'priority': event.priority,
            'movability': event.movability,
            'subject_tags': list(event.subject_tags),
            'cognitive_load': event.cognitive_load,
        }

    @staticmethod
    def load(owner_id: int, data: dict) -> CalendarEvent:
        return CalendarEvent(
            id=EventRef(owner_id=owner_id, client_id=data['client_id']),
            date=JalaliDate(data['jy'], data['jm'], data['jd']),
            slot=TimeRange(data['start_minutes'], data['end_minutes']),
            title=data['title'],
            description=data.get('description', ''),
            color=data.get('color', ''),
            all_day=data.get('all_day', False),
            kind=EventKind(data.get('kind', EventKind.MUTABLE.value)),
            origin=EventOrigin(data.get('origin', EventOrigin.STUDENT.value)),
            group_id=data.get('group_id', ''),
            version=data.get('version', 1),
            # اسنپ‌شات‌های پیش از افزوده‌شدن اولویت این کلیدها را ندارند؛
            # پیش‌فرض‌ها همان مقادیر خنثای موجودیت‌اند تا بازگردانی نشکند.
            priority=data.get('priority', 3),
            movability=data.get('movability', 2),
            subject_tags=tuple(data.get('subject_tags') or ()),
            cognitive_load=data.get('cognitive_load', 2),
        )
