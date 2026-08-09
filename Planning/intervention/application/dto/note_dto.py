from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ...domain.entities.consultant_note import ConsultantNote


@dataclass(frozen=True)
class ConsultantNoteDTO:
    id: int
    student_id: int
    body: str
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_entity(cls, note: ConsultantNote) -> 'ConsultantNoteDTO':
        return cls(
            id=note.id,
            student_id=note.student_id,
            body=note.body,
            created_at=note.created_at,
            updated_at=note.updated_at,
        )
