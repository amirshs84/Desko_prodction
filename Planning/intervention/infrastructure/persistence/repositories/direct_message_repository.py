"""پیاده‌سازی مخزن پیام مستقیم مشاور ↔ دانش‌آموز."""
from __future__ import annotations

from ....domain.entities.direct_message import DirectMessage
from ....domain.repositories.direct_message_repository import DirectMessageRepository
from .. import models as m
from ..mappers import DirectMessageMapper


class DjangoDirectMessageRepository(DirectMessageRepository):
    def add(self, message: DirectMessage) -> DirectMessage:
        row = DirectMessageMapper.to_model(message)
        row.save()
        message.id = row.id
        message.created_at = row.created_at
        return message

    def list_thread(
        self, *, consultant_id: int, student_id: int,
    ) -> list[DirectMessage]:
        rows = m.ConsultantDirectMessageModel.objects.filter(
            consultant_id=consultant_id, student_id=student_id,
        )
        return [DirectMessageMapper.to_entity(row) for row in rows]

    def list_for_student(self, *, student_id: int) -> list[DirectMessage]:
        rows = m.ConsultantDirectMessageModel.objects.filter(student_id=student_id)
        return [DirectMessageMapper.to_entity(row) for row in rows]
