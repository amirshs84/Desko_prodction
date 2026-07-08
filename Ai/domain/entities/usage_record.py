"""UsageRecord — لاگ تغییرناپذیر مصرف یک تولید (Aggregate Root).

منبع حقیقت مالی است؛ append-only و هرگز update/delete نمی‌شود. هزینه در لحظه‌ی
ثبت با نرخ فعال محاسبه و snapshot می‌شود تا تغییر قیمت‌های آینده، صورتحساب‌های
گذشته را دستکاری نکند.

چرا Decimal برای هزینه؟ اعداد اعشاری float برای پول خطای گردکردن دارند؛ Decimal
دقت مالی را تضمین می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.infrastructure.ids import uuid7
from ..value_objects.token_usage import TokenUsage


@dataclass(eq=False)
class UsageRecord(AggregateRoot):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    message_id: UUID
    model_id: UUID
    usage: TokenUsage
    cost: Decimal
    currency: str = "USD"

    @classmethod
    def create(
        cls,
        *,
        tenant_id: UUID,
        user_id: UUID,
        message_id: UUID,
        model_id: UUID,
        usage: TokenUsage,
        cost: Decimal,
        currency: str = "USD",
    ) -> "UsageRecord":
        return cls(
            id=uuid7(),
            tenant_id=tenant_id,
            user_id=user_id,
            message_id=message_id,
            model_id=model_id,
            usage=usage,
            cost=cost,
            currency=currency,
        )
