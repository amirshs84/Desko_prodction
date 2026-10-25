"""خروجی خواندنی جلسه‌ی مشاوره."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ...domain.entities.counseling_session import CounselingSession


@dataclass(frozen=True)
class CounselingSessionDTO:
    id: int
    student_id: int
    student_name: str
    title: str
    starts_at: datetime
    status: str
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_entity(
        cls, session: CounselingSession, *, student_name: str,
    ) -> 'CounselingSessionDTO':
        return cls(
            id=session.id,
            student_id=session.student_id,
            student_name=student_name,
            title=session.title,
            starts_at=session.starts_at,
            status=session.status,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
