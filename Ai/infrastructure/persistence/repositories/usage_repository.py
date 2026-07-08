"""پیاده‌سازی UsageRepository با Django ORM (append-only)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from django.db.models import Sum

from ....domain.entities.usage_record import UsageRecord
from ....domain.repositories.usage_repository import UsageRepository
from ....domain.value_objects.token_usage import TokenUsage
from ..models import UsageRecordModel


class DjangoUsageRepository(UsageRepository):
    def add(self, record: UsageRecord) -> None:
        UsageRecordModel.objects.create(
            id=record.id,
            tenant_id=record.tenant_id,
            user_id=record.user_id,
            message_id=record.message_id,
            model_id=record.model_id,
            prompt_tokens=record.usage.prompt_tokens,
            completion_tokens=record.usage.completion_tokens,
            cost=record.cost,
            currency=record.currency,
        )

    def aggregate_for_period(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID | None,
        start: date,
        end: date,
    ) -> tuple[TokenUsage, Decimal]:
        qs = UsageRecordModel.objects.filter(
            tenant_id=tenant_id,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        agg = qs.aggregate(
            p=Sum("prompt_tokens"), c=Sum("completion_tokens"), cost=Sum("cost")
        )
        usage = TokenUsage(
            prompt_tokens=agg["p"] or 0, completion_tokens=agg["c"] or 0
        )
        return usage, (agg["cost"] or Decimal("0"))
