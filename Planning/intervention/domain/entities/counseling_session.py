"""جلسه‌ی مشاوره؛ قرار ملاقات یک مشاور با یک دانش‌آموز."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ....shared.domain.entity import Entity
from ....shared.domain.errors import ValidationError

MAX_TITLE_LENGTH = 80
SCHEDULED = 'scheduled'
IN_PROGRESS = 'in_progress'
HELD = 'held'
CANCELLED = 'cancelled'
SESSION_STATUSES = frozenset({SCHEDULED, IN_PROGRESS, HELD, CANCELLED})


@dataclass(eq=False)
class CounselingSession(Entity):
    id: int | None
    school_id: int
    consultant_id: int
    student_id: int
    title: str
    starts_at: datetime
    status: str = SCHEDULED
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        school_id: int,
        consultant_id: int,
        student_id: int,
        title: str,
        starts_at: datetime,
    ) -> 'CounselingSession':
        if starts_at is None:
            raise ValidationError('زمان شروع جلسه لازم است.')
        return cls(
            id=None,
            school_id=school_id,
            consultant_id=consultant_id,
            student_id=student_id,
            title=_clean_title(title),
            starts_at=starts_at,
            status=SCHEDULED,
        )

    def retitle(self, title: str) -> None:
        self.title = _clean_title(title)

    def reschedule(self, starts_at: datetime) -> None:
        if starts_at is None:
            raise ValidationError('زمان شروع جلسه لازم است.')
        self.starts_at = starts_at

    def change_status(self, status: str) -> None:
        cleaned = str(status or '').strip()
        if cleaned not in SESSION_STATUSES:
            raise ValidationError(
                'وضعیت جلسه نامعتبر است.',
                meta={'allowed': sorted(SESSION_STATUSES)},
            )
        self.status = cleaned


def _clean_title(title: str) -> str:
    cleaned = (title or '').strip()
    if not cleaned:
        raise ValidationError('موضوع جلسه نمی‌تواند خالی باشد.')
    if len(cleaned) > MAX_TITLE_LENGTH:
        raise ValidationError(
            f'موضوع جلسه نباید بیش از {MAX_TITLE_LENGTH} نویسه باشد.',
            meta={'limit': MAX_TITLE_LENGTH},
        )
    return cleaned
