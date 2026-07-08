"""DTO های خروجی پیام و نتیجه‌ی ارسال."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...domain.entities.message import Message


@dataclass(frozen=True)
class MessageDTO:
    id: UUID
    conversation_id: UUID
    role: str
    status: str
    seq: int
    content: str | None
    parent_id: UUID | None
    active_version_id: UUID | None
    model_id: UUID | None
    version: int

    @classmethod
    def from_entity(cls, msg: Message) -> "MessageDTO":
        active = msg.active_version
        return cls(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role.value,
            status=msg.status.value,
            seq=msg.seq,
            content=active.content if active else None,
            parent_id=msg.parent_id,
            active_version_id=msg.active_version_id,
            model_id=msg.model_id,
            version=msg.version,
        )


@dataclass(frozen=True)
class SendMessageResult:
    """نتیجه‌ی بخش همگام ارسال پیام.

    پیام کاربر (نهایی) + پیام دستیار (PENDING). لایه‌ی interface از
    ``assistant_message.id`` آدرس stream را می‌سازد.
    """

    user_message: MessageDTO
    assistant_message: MessageDTO
