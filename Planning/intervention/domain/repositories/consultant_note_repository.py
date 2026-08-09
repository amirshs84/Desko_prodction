"""پورت مخزن یادداشت خصوصی مشاور."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..entities.consultant_note import ConsultantNote


@runtime_checkable
class ConsultantNoteRepository(Protocol):
    def add(self, note: ConsultantNote) -> ConsultantNote:
        ...

    def get(self, note_id: int, *, consultant_id: int) -> ConsultantNote:
        ...

    def list_for_student(
        self, *, consultant_id: int, student_id: int,
    ) -> list[ConsultantNote]:
        ...

    def save(self, note: ConsultantNote) -> None:
        ...

    def delete(self, note_id: int, *, consultant_id: int) -> None:
        ...
