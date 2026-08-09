"""یادداشت خصوصی مشاور درباره یک دانش‌آموز.

فقط همان مشاور مالک یادداشت است؛ دانش‌آموز هرگز نباید این موجودیت را ببیند.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ....shared.domain.entity import Entity
from ....shared.domain.errors import ValidationError

MAX_BODY_LENGTH = 5000


@dataclass(eq=False)
class ConsultantNote(Entity):
    id: int | None
    school_id: int
    consultant_id: int
    student_id: int
    body: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        school_id: int,
        consultant_id: int,
        student_id: int,
        body: str,
    ) -> 'ConsultantNote':
        return cls(
            id=None,
            school_id=school_id,
            consultant_id=consultant_id,
            student_id=student_id,
            body=_clean_body(body),
        )

    def belongs_to(self, consultant_id: int) -> bool:
        return self.consultant_id == consultant_id

    def rewrite(self, body: str) -> None:
        self.body = _clean_body(body)


def _clean_body(body: str) -> str:
    cleaned = (body or '').strip()
    if not cleaned:
        raise ValidationError('متن یادداشت نمی‌تواند خالی باشد.')
    if len(cleaned) > MAX_BODY_LENGTH:
        raise ValidationError(
            f'متن یادداشت نباید بیش از {MAX_BODY_LENGTH} نویسه باشد.',
            meta={'limit': MAX_BODY_LENGTH},
        )
    return cleaned
