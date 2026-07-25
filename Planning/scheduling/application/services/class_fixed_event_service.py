"""Use-case های رویداد ثابت مدرسه.

مدیر مدرسه برنامه‌ی کلاس را یک‌بار تعریف می‌کند و سیستم آن را روی تقویم همه‌ی
دانش‌آموزان آن کلاس «پخش» می‌کند (fan-out). این رویدادها ثابت (immutable) هستند؛
یعنی از این لحظه، مشاور و موتور برنامه‌ریزی موظف‌اند دور آن‌ها برنامه بچینند و
حق بازنویسی‌شان را ندارند — قاعده‌ای که در خود موجودیت دامنه اعمال می‌شود.

این سرویس نمی‌داند درخواست از کجا آمده (REST یا دستور مدیریتی) و نمی‌داند
دانش‌آموزان در کدام جدول ذخیره شده‌اند؛ فقط با پورت‌ها کار می‌کند.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Callable, Sequence

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import (
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from ...domain.entities.calendar_event import CalendarEvent
from ...domain.enums import EventKind
from ...domain.repositories.calendar_event_repository import CalendarEventRepository
from ...domain.value_objects.event_ref import EventRef
from ..commands.fixed_event_commands import (
    MAX_EVENTS_PER_REQUEST,
    CreateClassFixedEventsCommand,
    DeleteFixedEventGroupCommand,
)
from ..dto.fixed_event_dto import FixedEventCreationDTO, FixedEventGroupDTO
from ..ports.id_generator import IdGenerator


class ClassFixedEventService:
    def __init__(
        self,
        *,
        events: CalendarEventRepository,
        directory: SchoolDirectory,
        ids: IdGenerator,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._events = events
        self._directory = directory
        self._ids = ids
        self._uow_factory = uow_factory

    # ---------- نوشتن ----------

    def create_for_class(
        self, command: CreateClassFixedEventsCommand, *, context: RequestContext,
    ) -> FixedEventCreationDTO:
        school_id = _require_school(context)
        student_ids = self._class_student_ids(command.class_id, school_id)
        dates = command.resolve_dates()

        total = len(student_ids) * len(dates)
        if total > MAX_EVENTS_PER_REQUEST:
            raise ValidationError(
                'حجم این درخواست بیش از حد مجاز است؛ بازه‌ی تکرار را کوتاه‌تر کنید.',
                meta={'event_count': total, 'limit': MAX_EVENTS_PER_REQUEST},
            )

        group_id = self._ids.new_id()
        events = [
            CalendarEvent.create(
                ref=EventRef(owner_id=student_id, client_id=self._ids.new_id()),
                date=date,
                slot=command.slot,
                title=command.title,
                description=command.description,
                color=command.color,
                kind=EventKind.IMMUTABLE,
                authority=context.authority,
                group_id=group_id,
            )
            for student_id in student_ids
            for date in dates
        ]

        with self._uow_factory():
            created = self._events.add_many(events)

        return FixedEventCreationDTO(
            group_id=group_id,
            created_count=created,
            skipped_count=len(events) - created,
            student_count=len(student_ids),
            dates=tuple(dates),
        )

    def delete_group(
        self, command: DeleteFixedEventGroupCommand, *, context: RequestContext,
    ) -> int:
        school_id = _require_school(context)
        if context.authority is not WriteAuthority.SCHOOL_MANAGER:
            raise PermissionDeniedError('حذف رویداد ثابت فقط در اختیار مدیر مدرسه است.')

        student_ids = self._class_student_ids(command.class_id, school_id)
        with self._uow_factory():
            deleted = self._events.delete_by_group(command.group_id, owner_ids=student_ids)
        if deleted == 0:
            raise NotFoundError('گروه رویداد ثابت یافت نشد.', meta={'group_id': command.group_id})
        return deleted

    # ---------- خواندن ----------

    def list_groups_for_class(
        self, class_id: int, *, context: RequestContext,
    ) -> list[FixedEventGroupDTO]:
        school_id = _require_school(context)
        student_ids = self._class_student_ids(class_id, school_id, allow_empty=True)
        if not student_ids:
            return []

        grouped: dict[str, list[CalendarEvent]] = defaultdict(list)
        for event in self._events.list_by_owners(student_ids, kind=EventKind.IMMUTABLE):
            if event.group_id:
                grouped[event.group_id].append(event)

        groups = [FixedEventGroupDTO.from_events(gid, items) for gid, items in grouped.items()]
        groups.sort(key=lambda group: (group.dates[0].to_gregorian(), group.start_minutes))
        return groups

    # ---------- کمکی ----------

    def _class_student_ids(
        self, class_id: int, school_id: int, *, allow_empty: bool = False,
    ) -> Sequence[int]:
        self._directory.get_class(class_id, school_id=school_id)
        student_ids = self._directory.list_class_student_user_ids(class_id, school_id=school_id)
        if not student_ids and not allow_empty:
            raise ValidationError('این کلاس هیچ دانش‌آموز فعالی ندارد.')
        return student_ids


def _require_school(context: RequestContext) -> int:
    if context.school_id is None:
        raise PermissionDeniedError('این عملیات نیازمند عضویت در یک مدرسه است.')
    return context.school_id
