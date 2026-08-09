"""پیام مستقیم بین یک مشاور و یک دانش‌آموز همان مدرسه."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from ....shared.domain.entity import Entity
from ....shared.domain.errors import ValidationError

MAX_BODY_LENGTH = 4000


class MessageSender(str, Enum):
    CONSULTANT = 'consultant'
    STUDENT = 'student'


@dataclass(eq=False)
class DirectMessage(Entity):
    id: int | None
    school_id: int
    consultant_id: int
    student_id: int
    sender_role: MessageSender
    body: str
    created_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        school_id: int,
        consultant_id: int,
        student_id: int,
        sender_role: MessageSender,
        body: str,
    ) -> 'DirectMessage':
        if not isinstance(sender_role, MessageSender):
            raise ValidationError('نقش فرستنده نامعتبر است.')
        return cls(
            id=None,
            school_id=school_id,
            consultant_id=consultant_id,
            student_id=student_id,
            sender_role=sender_role,
            body=_clean_body(body),
        )


def _clean_body(body: str) -> str:
    cleaned = (body or '').strip()
    if not cleaned:
        raise ValidationError('متن پیام نمی‌تواند خالی باشد.')
    if len(cleaned) > MAX_BODY_LENGTH:
        raise ValidationError(
            f'متن پیام نباید بیش از {MAX_BODY_LENGTH} نویسه باشد.',
            meta={'limit': MAX_BODY_LENGTH},
        )
    return cleaned
