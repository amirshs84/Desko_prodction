"""پیاده‌سازی مخزن جلسه‌ی مشاوره."""
from __future__ import annotations

from datetime import datetime

from .....shared.domain.errors import NotFoundError
from ....domain.entities.counseling_session import CounselingSession
from ....domain.repositories.counseling_session_repository import CounselingSessionRepository
from .. import models as m
from ..mappers import CounselingSessionMapper


class DjangoCounselingSessionRepository(CounselingSessionRepository):
    def add(self, session: CounselingSession) -> CounselingSession:
        row = CounselingSessionMapper.to_model(session)
        row.save()
        session.id = row.id
        session.created_at = row.created_at
        session.updated_at = row.updated_at
        return session

    def get(self, session_id: int, *, consultant_id: int) -> CounselingSession:
        row = m.CounselingSessionModel.objects.filter(
            id=session_id, consultant_id=consultant_id,
        ).first()
        if row is None:
            raise NotFoundError('جلسه‌ی مشاوره یافت نشد.', meta={'session_id': session_id})
        return CounselingSessionMapper.to_entity(row)

    def list_for_student(
        self, *, consultant_id: int, student_id: int,
    ) -> list[CounselingSession]:
        rows = m.CounselingSessionModel.objects.filter(
            consultant_id=consultant_id, student_id=student_id,
        ).order_by('-starts_at', '-id')
        return [CounselingSessionMapper.to_entity(row) for row in rows]

    def list_between(
        self,
        *,
        consultant_id: int,
        start: datetime,
        end: datetime,
        student_id: int | None = None,
    ) -> list[CounselingSession]:
        rows = m.CounselingSessionModel.objects.filter(
            consultant_id=consultant_id,
            starts_at__gte=start,
            starts_at__lt=end,
        )
        if student_id is not None:
            rows = rows.filter(student_id=student_id)
        rows = rows.order_by('starts_at', 'id')
        return [CounselingSessionMapper.to_entity(row) for row in rows]

    def save(self, session: CounselingSession) -> None:
        updated = m.CounselingSessionModel.objects.filter(
            id=session.id, consultant_id=session.consultant_id,
        ).update(
            title=session.title,
            starts_at=session.starts_at,
            status=session.status,
        )
        if updated == 0:
            raise NotFoundError('جلسه‌ی مشاوره یافت نشد.', meta={'session_id': session.id})

    def delete(self, session_id: int, *, consultant_id: int) -> None:
        deleted, _ = m.CounselingSessionModel.objects.filter(
            id=session_id, consultant_id=consultant_id,
        ).delete()
        if deleted == 0:
            raise NotFoundError('جلسه‌ی مشاوره یافت نشد.', meta={'session_id': session_id})
