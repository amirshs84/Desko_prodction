"""Use-case های خواندن و ویرایش تقویم یک دانش‌آموز.

این سرویس تنها مسیر نوشتن روی تقویم است؛ چه دانش‌آموز خودش رویداد بسازد، چه مشاور
با درگ‌ودراپ جابه‌جا کند، چه موتور برنامه‌ریزی برنامه‌ی گروهی را اعمال کند. تفاوت
این سه فقط در ``context.authority`` است و بس. نتیجه: قاعده‌ی «رویداد ثابت مدرسه
دست‌نخوردنی است» یک‌جا اعمال می‌شود و هیچ مسیری نمی‌تواند دورش بزند.

تشخیص اینکه چه کسی حق دیدن/ویرایش تقویم چه کسی را دارد، وظیفه‌ی لایه‌ی interface
است؛ این سرویس فقط ``owner_id`` تأییدشده را می‌گیرد.
"""
from __future__ import annotations

from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.errors import NotFoundError
from ...domain.entities.calendar_event import CalendarEvent
from ...domain.repositories.calendar_event_repository import CalendarEventRepository
from ...domain.value_objects.event_ref import EventRef
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange
from ..commands.calendar_commands import (
    CreateEventsCommand,
    UpdateEventCommand,
    UpdateGroupCommand,
)
from .study_reminder import cancel_study_reminder, sync_study_reminder, sync_study_reminders


class CalendarService:
    def __init__(
        self,
        *,
        events: CalendarEventRepository,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._events = events
        self._uow_factory = uow_factory

    # ---------- خواندن ----------

    def list_events(
        self,
        owner_id: int,
        *,
        date_from: JalaliDate | None = None,
        date_to: JalaliDate | None = None,
    ) -> list[CalendarEvent]:
        return self._events.list_for_owner(owner_id, date_from=date_from, date_to=date_to)

    def get_event(self, owner_id: int, client_id: str) -> CalendarEvent:
        return self._events.get(EventRef(owner_id=owner_id, client_id=client_id))

    # ---------- نوشتن ----------

    def create_events(
        self, command: CreateEventsCommand, *, context: RequestContext,
    ) -> list[CalendarEvent]:
        events = [
            CalendarEvent.create(
                ref=EventRef(owner_id=command.owner_id, client_id=draft.client_id),
                date=draft.date,
                slot=draft.slot,
                title=draft.title,
                description=draft.description,
                color=draft.color,
                all_day=draft.all_day,
                group_id=draft.group_id,
                authority=context.authority,
            )
            for draft in command.drafts
        ]
        with self._uow_factory():
            self._events.add_many(events)
        sync_study_reminders(events)
        return events

    def update_event(
        self, command: UpdateEventCommand, *, context: RequestContext,
    ) -> CalendarEvent:
        event = self._events.get(EventRef(owner_id=command.owner_id, client_id=command.client_id))

        with self._uow_factory():
            event.apply_patch(
                authority=context.authority,
                date=(
                    _merge_date(event.date, command.jy, command.jm, command.jd)
                    if command.touches_date else None
                ),
                slot=_merge_slot(event.slot, command.start_minutes, command.end_minutes),
                title=command.title,
                description=command.description,
                color=command.color,
                all_day=command.all_day,
            )
            self._events.save(event)
        sync_study_reminder(event)
        return event

    def delete_event(self, owner_id: int, client_id: str, *, context: RequestContext) -> None:
        ref = EventRef(owner_id=owner_id, client_id=client_id)
        event = self._events.get(ref)
        event.ensure_writable_by(context.authority)
        with self._uow_factory():
            self._events.delete(ref)
        cancel_study_reminder(owner_id, client_id)

    def update_group(self, command: UpdateGroupCommand, *, context: RequestContext) -> int:
        events = self._group_or_404(command.owner_id, command.group_id)
        with self._uow_factory():
            for event in events:
                event.apply_patch(
                    authority=context.authority,
                    title=command.title,
                    description=command.description,
                    color=command.color,
                    slot=_merge_slot(event.slot, command.start_minutes, command.end_minutes),
                    all_day=command.all_day,
                )
                self._events.save(event)
        sync_study_reminders(events)
        return len(events)

    def delete_group(self, owner_id: int, group_id: str, *, context: RequestContext) -> int:
        events = self._group_or_404(owner_id, group_id)
        for event in events:
            event.ensure_writable_by(context.authority)
        with self._uow_factory():
            deleted = self._events.delete_by_group(group_id, owner_ids=[owner_id])
        for event in events:
            cancel_study_reminder(owner_id, event.client_id)
        return deleted

    # ---------- کمکی ----------

    def _group_or_404(self, owner_id: int, group_id: str) -> list[CalendarEvent]:
        events = self._events.list_by_group(group_id, owner_ids=[owner_id])
        if not events:
            raise NotFoundError('گروه یافت نشد.', meta={'group_id': group_id})
        return events


def _merge_date(current: JalaliDate, jy: int | None, jm: int | None, jd: int | None) -> JalaliDate:
    return JalaliDate(
        jy if jy is not None else current.jy,
        jm if jm is not None else current.jm,
        jd if jd is not None else current.jd,
    )


def _merge_slot(current: TimeRange, start: int | None, end: int | None) -> TimeRange:
    if start is None and end is None:
        return current
    return TimeRange(
        start if start is not None else current.start_minutes,
        end if end is not None else current.end_minutes,
    )
