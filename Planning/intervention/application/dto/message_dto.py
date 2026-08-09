from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ...domain.entities.direct_message import DirectMessage


@dataclass(frozen=True)
class DirectMessageDTO:
    id: int
    consultant_id: int
    student_id: int
    sender_role: str
    body: str
    created_at: datetime | None

    @classmethod
    def from_entity(cls, message: DirectMessage) -> 'DirectMessageDTO':
        return cls(
            id=message.id,
            consultant_id=message.consultant_id,
            student_id=message.student_id,
            sender_role=message.sender_role.value,
            body=message.body,
            created_at=message.created_at,
        )
