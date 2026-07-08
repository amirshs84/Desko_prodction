"""رویدادهای دامنه‌ی اپ Ai.

Aggregate ها این رویدادها را هنگام تغییر وضعیت مهم ثبت می‌کنند؛ لایه‌ی
application پس از commit موفق منتشرشان می‌کند تا Contextهای دیگر (Billing,
Notification, Knowledge) به‌صورت decoupled واکنش نشان دهند.

مثال: با MessageCompleted، Context صورتحساب UsageRecord ثبت می‌کند و شمارنده‌ی
quota را افزایش می‌دهد — بدون آنکه Aggregate پیام از وجود Billing خبر داشته باشد.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ..shared.domain.events import DomainEvent
from .value_objects.token_usage import TokenUsage


@dataclass(frozen=True)
class ConversationCreated(DomainEvent):
    conversation_id: UUID = None  # type: ignore[assignment]
    tenant_id: UUID = None  # type: ignore[assignment]
    user_id: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class ConversationArchived(DomainEvent):
    conversation_id: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class MessageSubmitted(DomainEvent):
    message_id: UUID = None  # type: ignore[assignment]
    conversation_id: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class MessageCompleted(DomainEvent):
    message_id: UUID = None  # type: ignore[assignment]
    conversation_id: UUID = None  # type: ignore[assignment]
    tenant_id: UUID = None  # type: ignore[assignment]
    user_id: UUID = None  # type: ignore[assignment]
    model_id: UUID = None  # type: ignore[assignment]
    usage: TokenUsage = None  # type: ignore[assignment]


@dataclass(frozen=True)
class MessageFailed(DomainEvent):
    message_id: UUID = None  # type: ignore[assignment]
    reason: str = ""
