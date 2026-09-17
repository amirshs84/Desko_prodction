"""پورت نوشتن و خواندن کاتالوگ درس مدرسه."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..value_objects.subject_profile import SubjectProfile


@runtime_checkable
class SubjectProfileRepository(Protocol):
    def list_for_school(self, school_id: int) -> tuple[SubjectProfile, ...]:
        ...

    def save(
        self, *, school_id: int, profile: SubjectProfile, baseline_units_per_hour: int = 0,
    ) -> SubjectProfile:
        ...

    def delete(self, *, school_id: int, name: str) -> bool:
        ...
