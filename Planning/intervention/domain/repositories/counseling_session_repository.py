"""پورت مخزن جلسات مشاوره."""
from __future__ import annotations

from datetime import datetime
from typing import Protocol, runtime_checkable

from ..entities.counseling_session import CounselingSession


@runtime_checkable
class CounselingSessionRepository(Protocol):
    def add(self, session: CounselingSession) -> CounselingSession:
        ...

    def get(self, session_id: int, *, consultant_id: int) -> CounselingSession:
        ...

    def list_for_student(
        self, *, consultant_id: int, student_id: int,
    ) -> list[CounselingSession]:
        ...

    def list_between(
        self,
        *,
        consultant_id: int,
        start: datetime,
        end: datetime,
        student_id: int | None = None,
    ) -> list[CounselingSession]:
        ...

    def save(self, session: CounselingSession) -> None:
        ...

    def delete(self, session_id: int, *, consultant_id: int) -> None:
        ...
