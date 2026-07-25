"""پیاده‌سازی مخزن رویداد تقویم روی Django ORM.

تنها لایه‌ای که QuerySet می‌بیند همین است؛ خروجی همه‌ی متدها موجودیت دامنه است تا
لایه‌های بالاتر به ORM گره نخورند.
"""
from __future__ import annotations

from typing import Sequence

from django.db.models import QuerySet

from .....shared.domain.errors import ConcurrencyConflictError, NotFoundError
from ....domain.entities.calendar_event import CalendarEvent
from ....domain.enums import EventKind
from ....domain.repositories.calendar_event_repository import CalendarEventRepository
from ....domain.value_objects.event_ref import EventRef
from ....domain.value_objects.jalali_date import JalaliDate
from .. import models as m
from ..mappers import CalendarEventMapper


class DjangoCalendarEventRepository(CalendarEventRepository):
    def list_for_owner(
        self,
        owner_id: int,
        *,
        date_from: JalaliDate | None = None,
        date_to: JalaliDate | None = None,
    ) -> list[CalendarEvent]:
        queryset = m.CalendarEventModel.objects.filter(user_id=owner_id)
        return self._to_entities(self._apply_date_range(queryset, date_from, date_to))

    def list_by_owners(
        self,
        owner_ids: Sequence[int],
        *,
        kind: EventKind | None = None,
        date_from: JalaliDate | None = None,
        date_to: JalaliDate | None = None,
    ) -> list[CalendarEvent]:
        if not owner_ids:
            return []
        queryset = m.CalendarEventModel.objects.filter(user_id__in=list(owner_ids))
        if kind is not None:
            queryset = queryset.filter(kind=kind.value)
        return self._to_entities(self._apply_date_range(queryset, date_from, date_to))

    def find(self, ref: EventRef) -> CalendarEvent | None:
        row = m.CalendarEventModel.objects.filter(
            user_id=ref.owner_id, client_id=ref.client_id,
        ).first()
        return CalendarEventMapper.to_entity(row) if row is not None else None

    def get(self, ref: EventRef) -> CalendarEvent:
        event = self.find(ref)
        if event is None:
            raise NotFoundError('رویداد مورد نظر یافت نشد.', meta={'client_id': ref.client_id})
        return event

    def add_many(self, events: Sequence[CalendarEvent]) -> int:
        if not events:
            return 0
        existing = self._existing_refs(events)
        fresh = [event for event in events if (event.owner_id, event.client_id) not in existing]
        if not fresh:
            return 0
        rows = [CalendarEventMapper.to_model(event) for event in fresh]
        m.CalendarEventModel.objects.bulk_create(rows, ignore_conflicts=True)
        for event, row in zip(fresh, rows):
            event.persisted_version = event.version
            # ``auto_now_add`` مقدار را روی نمونه‌ها می‌گذارد؛ به موجودیت برمی‌گردانیم
            # تا پاسخ API زمان واقعی ایجاد را داشته باشد.
            event.created_at = row.created_at
        return len(fresh)

    def save(self, event: CalendarEvent) -> None:
        if event.persisted_version is None:
            self.add_many([event])
            return

        row = m.CalendarEventModel(user_id=event.owner_id, client_id=event.client_id)
        CalendarEventMapper.apply_to_model(event, row)
        updated = m.CalendarEventModel.objects.filter(
            user_id=event.owner_id,
            client_id=event.client_id,
            version=event.persisted_version,
        ).update(**{column: getattr(row, column) for column in CalendarEventMapper.MUTABLE_COLUMNS})

        if updated == 0:
            if self._exists(event.id):
                raise ConcurrencyConflictError(meta={'client_id': event.client_id})
            raise NotFoundError('رویداد مورد نظر یافت نشد.', meta={'client_id': event.client_id})
        event.persisted_version = event.version

    def delete(self, ref: EventRef) -> None:
        deleted, _ = m.CalendarEventModel.objects.filter(
            user_id=ref.owner_id, client_id=ref.client_id,
        ).delete()
        if deleted == 0:
            raise NotFoundError('رویداد مورد نظر یافت نشد.', meta={'client_id': ref.client_id})

    def list_by_group(
        self, group_id: str, *, owner_ids: Sequence[int] | None = None,
    ) -> list[CalendarEvent]:
        return self._to_entities(self._group_queryset(group_id, owner_ids))

    def delete_by_group(self, group_id: str, *, owner_ids: Sequence[int] | None = None) -> int:
        deleted, _ = self._group_queryset(group_id, owner_ids).delete()
        return deleted

    def delete_mutable_for_owner(self, owner_id: int) -> int:
        deleted, _ = m.CalendarEventModel.objects.filter(
            user_id=owner_id, kind=EventKind.MUTABLE.value,
        ).delete()
        return deleted

    # ---------- کمکی‌ها ----------

    @staticmethod
    def _apply_date_range(
        queryset: QuerySet[m.CalendarEventModel],
        date_from: JalaliDate | None,
        date_to: JalaliDate | None,
    ) -> QuerySet[m.CalendarEventModel]:
        # کوئری بازه‌ای روی ستون میلادیِ ایندکس‌شده انجام می‌شود، چون مقایسه‌ی
        # سه‌ستونی (jy, jm, jd) نه ایندکس‌پذیر است و نه مرز ماه/سال را درست می‌بُرد.
        if date_from is not None:
            queryset = queryset.filter(date__gte=date_from.to_gregorian())
        if date_to is not None:
            queryset = queryset.filter(date__lte=date_to.to_gregorian())
        return queryset

    def _group_queryset(
        self, group_id: str, owner_ids: Sequence[int] | None,
    ) -> QuerySet[m.CalendarEventModel]:
        if not group_id:
            return m.CalendarEventModel.objects.none()
        queryset = m.CalendarEventModel.objects.filter(group_id=group_id)
        if owner_ids is not None:
            queryset = queryset.filter(user_id__in=list(owner_ids))
        return queryset

    def _exists(self, ref: EventRef) -> bool:
        return m.CalendarEventModel.objects.filter(
            user_id=ref.owner_id, client_id=ref.client_id,
        ).exists()

    @staticmethod
    def _existing_refs(events: Sequence[CalendarEvent]) -> set[tuple[int, str]]:
        """جفت‌های (مالک، client_id) که از قبل در دیتابیس هستند.

        در دسته‌های کوچک کوئری می‌زنیم چون تعداد پارامترهای مجاز در یک عبارت
        ``IN`` روی SQLite محدود است و برنامه‌ی گروهی می‌تواند صدها رویداد بسازد.
        """
        owner_ids = {event.owner_id for event in events}
        client_ids = sorted({event.client_id for event in events})
        found: set[tuple[int, str]] = set()
        chunk_size = 300
        for start in range(0, len(client_ids), chunk_size):
            found.update(
                m.CalendarEventModel.objects.filter(
                    user_id__in=owner_ids,
                    client_id__in=client_ids[start:start + chunk_size],
                ).values_list('user_id', 'client_id')
            )
        return found

    @staticmethod
    def _to_entities(queryset: QuerySet[m.CalendarEventModel]) -> list[CalendarEvent]:
        return [CalendarEventMapper.to_entity(row) for row in queryset.iterator()]
