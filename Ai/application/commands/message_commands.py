"""Command های Context پیام."""
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from ...shared.application.cqrs import Command


@dataclass(frozen=True)
class SendMessageCommand(Command):
    conversation_id: UUID
    content: str
    parent_id: UUID | None = None
    quoted_message_id: UUID | None = None
    attachment_ids: tuple[UUID, ...] = field(default_factory=tuple)
    # برای جلوگیری از پیام تکراری در retry شبکه (idempotency).
    idempotency_key: str | None = None


@dataclass(frozen=True)
class EditMessageCommand(Command):
    """ویرایش پیام کاربر (نسخه‌ی جدید می‌سازد؛ تاریخچه حفظ می‌شود)."""

    message_id: UUID
    new_content: str
    expected_version: int


@dataclass(frozen=True)
class MutateMessageCommand(Command):
    """برای عملیات‌های وضعیتی پیام: delete, retry, regenerate."""

    message_id: UUID
    expected_version: int
