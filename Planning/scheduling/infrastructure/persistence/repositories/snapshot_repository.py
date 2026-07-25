"""پیاده‌سازی مخزن اسنپ‌شات روی Django ORM."""
from __future__ import annotations

from .....shared.domain.errors import NotFoundError
from ....domain.entities.calendar_snapshot import CalendarSnapshot
from ....domain.repositories.snapshot_repository import CalendarSnapshotRepository
from .. import models as m
from ..mappers import SnapshotPayloadMapper


class DjangoCalendarSnapshotRepository(CalendarSnapshotRepository):
    def add(self, snapshot: CalendarSnapshot) -> CalendarSnapshot:
        row = m.CalendarSnapshotModel.objects.create(
            user_id=snapshot.owner_id,
            reason=snapshot.reason,
            plan_run_id=snapshot.plan_run_id,
            payload=[SnapshotPayloadMapper.dump(event) for event in snapshot.events],
            event_count=snapshot.event_count,
        )
        return self._to_entity(row)

    def get(self, snapshot_id: int, *, owner_id: int) -> CalendarSnapshot:
        row = m.CalendarSnapshotModel.objects.filter(id=snapshot_id, user_id=owner_id).first()
        if row is None:
            raise NotFoundError('نسخه‌ی مورد نظر یافت نشد.', meta={'snapshot_id': snapshot_id})
        return self._to_entity(row)

    def list_for_owner(self, owner_id: int, *, limit: int = 10) -> list[CalendarSnapshot]:
        rows = m.CalendarSnapshotModel.objects.filter(user_id=owner_id).defer('payload')[:limit]
        return [self._to_entity(row, with_events=False) for row in rows]

    def prune(self, owner_id: int, *, keep: int) -> int:
        survivors = list(
            m.CalendarSnapshotModel.objects.filter(user_id=owner_id)
            .values_list('id', flat=True)[:keep]
        )
        deleted, _ = m.CalendarSnapshotModel.objects.filter(user_id=owner_id).exclude(
            id__in=survivors,
        ).delete()
        return deleted

    @staticmethod
    def _to_entity(row: m.CalendarSnapshotModel, *, with_events: bool = True) -> CalendarSnapshot:
        events = (
            tuple(SnapshotPayloadMapper.load(row.user_id, item) for item in row.payload)
            if with_events else ()
        )
        return CalendarSnapshot(
            id=row.id,
            owner_id=row.user_id,
            reason=row.reason,
            plan_run_id=row.plan_run_id,
            events=events,
            taken_at=row.created_at,
            event_count=row.event_count,
        )
