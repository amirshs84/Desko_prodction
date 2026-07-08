"""پیاده‌سازی AIModelRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from ....domain.entities.ai_model import AIModel
from ....domain.enums import Capability
from ....domain.repositories.ai_model_repository import AIModelRepository
from ..mappers import AIModelMapper
from ..models import AIModelModel


class DjangoAIModelRepository(AIModelRepository):
    def get(self, model_id: UUID) -> AIModel | None:
        row = AIModelModel.objects.filter(id=model_id).first()
        return AIModelMapper.to_entity(row) if row else None

    def get_by_key(self, key: str) -> AIModel | None:
        row = AIModelModel.objects.filter(key=key).first()
        return AIModelMapper.to_entity(row) if row else None

    def list_active(self, *, capability: Capability | None = None) -> list[AIModel]:
        rows = AIModelModel.objects.filter(is_active=True).order_by("-priority")
        entities = [AIModelMapper.to_entity(r) for r in rows]
        if capability is not None:
            # capabilities مجموعه‌ی کوچکی است؛ فیلتر در پایتون ساده و کافی است.
            entities = [e for e in entities if e.supports(capability)]
        return entities
