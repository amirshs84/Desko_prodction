"""Conversation — مکالمه (Aggregate Root).

مالک منطقی پیام‌هاست اما به‌دلیل مقیاس، پیام‌ها Aggregate مستقل‌اند و از طریق
id ارجاع می‌شوند (نه object graph). این Aggregate مسئول invariantهای سطح مکالمه
است: وضعیت، تنظیمات مدل فعال، فلگ‌ها و عنوان.

State Machine:
    ACTIVE ⇄ ARCHIVED
    ACTIVE/ARCHIVED → DELETED (soft)
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.domain.errors import InvalidStateError, ValidationError
from ...shared.infrastructure.ids import uuid7
from ..enums import ConversationStatus
from ..events import ConversationArchived, ConversationCreated
from ..value_objects.flags import ConversationFlags
from ..value_objects.model_config import ModelConfig

_MAX_TITLE_LEN = 200


@dataclass(eq=False)
class Conversation(AggregateRoot):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    title: str
    model_config: ModelConfig
    status: ConversationStatus = ConversationStatus.ACTIVE
    flags: ConversationFlags = ConversationFlags()
    # concurrency token برای قفل خوش‌بینانه (هم‌راستا با ستون version در دیتابیس).
    version: int = 1

    # ---------- Factory ----------

    @classmethod
    def start(
        cls,
        *,
        tenant_id: UUID,
        user_id: UUID,
        model_config: ModelConfig,
        title: str | None = None,
    ) -> "Conversation":
        conversation = cls(
            id=uuid7(),
            tenant_id=tenant_id,
            user_id=user_id,
            title=cls._normalize_title(title or "مکالمه جدید"),
            model_config=model_config,
        )
        conversation.record_event(
            ConversationCreated(
                conversation_id=conversation.id,
                tenant_id=tenant_id,
                user_id=user_id,
            )
        )
        return conversation

    # ---------- رفتارها ----------

    def rename(self, title: str) -> None:
        self._ensure_not_deleted()
        self.title = self._normalize_title(title)

    def toggle_pin(self) -> None:
        self._ensure_not_deleted()
        self.flags = self.flags.toggled_pin()

    def toggle_favorite(self) -> None:
        self._ensure_not_deleted()
        self.flags = self.flags.toggled_favorite()

    def change_model(self, model_id: UUID) -> None:
        self._ensure_not_deleted()
        self.model_config = self.model_config.with_model(model_id)

    def archive(self) -> None:
        if self.status is ConversationStatus.DELETED:
            raise InvalidStateError("مکالمه‌ی حذف‌شده قابل بایگانی نیست.")
        self.status = ConversationStatus.ARCHIVED
        self.record_event(ConversationArchived(conversation_id=self.id))

    def unarchive(self) -> None:
        if self.status is not ConversationStatus.ARCHIVED:
            raise InvalidStateError("فقط مکالمه‌ی بایگانی‌شده قابل بازگرداندن است.")
        self.status = ConversationStatus.ACTIVE

    def mark_deleted(self) -> None:
        self.status = ConversationStatus.DELETED

    def ensure_can_accept_message(self) -> None:
        """Invariant: پیام جدید فقط به مکالمه‌ی فعال/بایگانی افزوده می‌شود."""
        if self.status is ConversationStatus.DELETED:
            raise InvalidStateError("به مکالمه‌ی حذف‌شده نمی‌توان پیام افزود.")

    # ---------- کمکی‌ها ----------

    def _ensure_not_deleted(self) -> None:
        if self.status is ConversationStatus.DELETED:
            raise InvalidStateError("این عملیات روی مکالمه‌ی حذف‌شده مجاز نیست.")

    @staticmethod
    def _normalize_title(title: str) -> str:
        title = (title or "").strip()
        if not title:
            raise ValidationError("عنوان مکالمه نمی‌تواند خالی باشد.")
        return title[:_MAX_TITLE_LEN]
