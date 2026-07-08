"""Message — پیام مکالمه (Aggregate Root).

این پیچیده‌ترین Aggregate دامنه است و همزمان از این فیچرها پشتیبانی می‌کند:
Edit، Delete، Retry، Regenerate، Quote Reply، Parent، Thread.

طراحی کلیدی: جداسازی «هویت پیام» (Message) از «محتوا» (MessageVersion). پیام
هویت پایدار و موقعیت در درخت را نگه می‌دارد؛ محتوا در نسخه‌ها زندگی می‌کند.

Message به‌عنوان Aggregate Root مستقل (نه صرفاً بخشی از Conversation) مدل شده،
چون در مقیاس (هزاران پیام) باید مستقل بارگذاری/ذخیره شود. ارجاع به مکالمه و پیام
والد فقط via id است تا مرزهای Aggregate حفظ شود.

State Machine (فقط برای assistant/tool؛ پیام کاربر مستقیماً COMPLETED است):
    PENDING → STREAMING → COMPLETED
    PENDING/STREAMING → FAILED → (retry) → PENDING
    PENDING/STREAMING → CANCELLED
"""
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.domain.errors import InvalidStateError, ValidationError
from ...shared.infrastructure.ids import uuid7
from ..enums import MessageStatus, Role
from ..events import MessageCompleted, MessageFailed
from ..value_objects.token_usage import TokenUsage
from .message_version import MessageVersion

# گذارهای مجاز وضعیت؛ تنها منبع حقیقت برای اعتبارسنجی چرخه‌ی عمر پیام.
_ALLOWED_TRANSITIONS: dict[MessageStatus, set[MessageStatus]] = {
    MessageStatus.PENDING: {
        MessageStatus.STREAMING,
        MessageStatus.COMPLETED,
        MessageStatus.FAILED,
        MessageStatus.CANCELLED,
    },
    MessageStatus.STREAMING: {
        MessageStatus.COMPLETED,
        MessageStatus.FAILED,
        MessageStatus.CANCELLED,
    },
    MessageStatus.FAILED: {MessageStatus.PENDING},  # retry
    MessageStatus.COMPLETED: {MessageStatus.PENDING},  # regenerate (تلاش تازه، نسخه‌ی جدید)
    MessageStatus.CANCELLED: {MessageStatus.PENDING},  # امکان تلاش مجدد
}


@dataclass(eq=False)
class Message(AggregateRoot):
    id: UUID
    tenant_id: UUID
    conversation_id: UUID
    role: Role
    status: MessageStatus
    seq: int
    parent_id: UUID | None = None
    quoted_message_id: UUID | None = None
    thread_root_id: UUID | None = None
    model_id: UUID | None = None
    active_version_id: UUID | None = None
    versions: list[MessageVersion] = field(default_factory=list)
    # concurrency token برای قفل خوش‌بینانه.
    version: int = 1

    # ---------- Factoryها ----------

    @classmethod
    def create_user_message(
        cls,
        *,
        tenant_id: UUID,
        conversation_id: UUID,
        seq: int,
        content: str,
        parent_id: UUID | None = None,
        quoted_message_id: UUID | None = None,
        thread_root_id: UUID | None = None,
    ) -> "Message":
        if not content or not content.strip():
            raise ValidationError("متن پیام نمی‌تواند خالی باشد.")
        message = cls(
            id=uuid7(),
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role=Role.USER,
            status=MessageStatus.COMPLETED,  # پیام کاربر بلافاصله نهایی است
            seq=seq,
            parent_id=parent_id,
            quoted_message_id=quoted_message_id,
            thread_root_id=thread_root_id,
        )
        message._append_version(content=content, finish_reason="user")
        return message

    @classmethod
    def create_assistant_placeholder(
        cls,
        *,
        tenant_id: UUID,
        conversation_id: UUID,
        seq: int,
        parent_id: UUID,
        model_id: UUID,
        thread_root_id: UUID | None = None,
    ) -> "Message":
        # جای‌گیرنده‌ی PENDING؛ محتوا بعداً توسط worker پر می‌شود (async).
        return cls(
            id=uuid7(),
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role=Role.ASSISTANT,
            status=MessageStatus.PENDING,
            seq=seq,
            parent_id=parent_id,
            model_id=model_id,
            thread_root_id=thread_root_id,
        )

    # ---------- گذارهای وضعیت ----------

    def begin_streaming(self) -> None:
        self._transition(MessageStatus.STREAMING)

    def complete(
        self,
        *,
        content: str,
        usage: TokenUsage,
        finish_reason: str = "stop",
    ) -> None:
        self._transition(MessageStatus.COMPLETED)
        version = self._append_version(
            content=content, finish_reason=finish_reason, usage=usage
        )
        self.record_event(
            MessageCompleted(
                message_id=self.id,
                conversation_id=self.conversation_id,
                tenant_id=self.tenant_id,
                user_id=None,  # توسط لایه‌ی application از context پر می‌شود
                model_id=self.model_id,
                usage=usage,
            )
        )
        return version  # type: ignore[return-value]

    def fail(self, reason: str) -> None:
        self._transition(MessageStatus.FAILED)
        self.record_event(MessageFailed(message_id=self.id, reason=reason))

    def cancel(self) -> None:
        self._transition(MessageStatus.CANCELLED)

    def retry(self) -> None:
        """پس از شکست/لغو، برای تلاش مجدد به PENDING بازمی‌گردد."""
        if self.role is not Role.ASSISTANT:
            raise InvalidStateError("فقط پاسخ دستیار قابل تلاش مجدد است.")
        self._transition(MessageStatus.PENDING)

    def regenerate(self) -> None:
        """تولید مجدد پاسخِ دستیارِ کامل‌شده.

        پیام به PENDING بازمی‌گردد تا worker یک تلاش تازه بزند و ``complete`` یک
        MessageVersion جدید اضافه کند؛ نسخه‌های قبلی حفظ می‌شوند تا کاربر بتواند
        بین آن‌ها جابه‌جا شود (فیچر «نسخه‌های پاسخ»).
        """
        if self.role is not Role.ASSISTANT:
            raise InvalidStateError("فقط پاسخ دستیار قابل تولید مجدد است.")
        if self.status is not MessageStatus.COMPLETED:
            raise InvalidStateError("فقط پاسخ کامل‌شده قابل تولید مجدد است.")
        self._transition(MessageStatus.PENDING)

    # ---------- ویرایش و تولید مجدد ----------

    def edit(self, new_content: str) -> MessageVersion:
        """نسخه‌ی جدیدی از محتوا می‌سازد (تاریخچه حفظ می‌شود).

        فقط برای پیام کاربر مجاز است؛ ویرایش پاسخ assistant از مسیر regenerate
        انجام می‌شود.
        """
        if self.role is not Role.USER:
            raise InvalidStateError("فقط پیام کاربر قابل ویرایش است.")
        if not new_content or not new_content.strip():
            raise ValidationError("متن ویرایش‌شده نمی‌تواند خالی باشد.")
        return self._append_version(content=new_content, finish_reason="edited")

    def switch_active_version(self, version_id: UUID) -> None:
        if version_id not in {v.id for v in self.versions}:
            raise ValidationError("نسخه‌ی موردنظر متعلق به این پیام نیست.")
        self.active_version_id = version_id

    @property
    def active_version(self) -> MessageVersion | None:
        return next(
            (v for v in self.versions if v.id == self.active_version_id), None
        )

    # ---------- کمکی‌های داخلی ----------

    def _append_version(
        self,
        *,
        content: str,
        finish_reason: str | None,
        usage: TokenUsage | None = None,
    ) -> MessageVersion:
        version = MessageVersion(
            id=uuid7(),
            message_id=self.id,
            version_no=len(self.versions) + 1,
            content=content,
            finish_reason=finish_reason,
            usage=usage,
        )
        self.versions.append(version)
        self.active_version_id = version.id
        return version

    def _transition(self, target: MessageStatus) -> None:
        allowed = _ALLOWED_TRANSITIONS.get(self.status, set())
        if target not in allowed:
            raise InvalidStateError(
                f"گذار وضعیت از «{self.status.value}» به «{target.value}» مجاز نیست."
            )
        self.status = target
