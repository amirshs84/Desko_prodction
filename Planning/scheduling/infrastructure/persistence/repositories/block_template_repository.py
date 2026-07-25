"""آداپتور Django برای بلوک‌های آماده‌ی شخصی مشاور."""
from __future__ import annotations

from ....domain.value_objects.block_template import BlockTemplate
from ..models import SavedBlockTemplateModel


def _to_vo(row: SavedBlockTemplateModel) -> BlockTemplate:
    return BlockTemplate(
        key=row.key,
        title=row.title,
        duration_minutes=row.duration_minutes,
        color=row.color,
    )


class DjangoBlockTemplateRepository:
    def list_for_owner(self, owner_id: int) -> tuple[BlockTemplate, ...]:
        rows = SavedBlockTemplateModel.objects.filter(owner_id=owner_id)
        return tuple(_to_vo(row) for row in rows)

    def get_for_owner(self, owner_id: int, key: str) -> BlockTemplate | None:
        row = SavedBlockTemplateModel.objects.filter(owner_id=owner_id, key=key).first()
        return _to_vo(row) if row else None

    def save(self, owner_id: int, template: BlockTemplate) -> BlockTemplate:
        row, _ = SavedBlockTemplateModel.objects.update_or_create(
            owner_id=owner_id,
            key=template.key,
            defaults={
                'title': template.title,
                'duration_minutes': template.duration_minutes,
                'color': template.color,
            },
        )
        return _to_vo(row)

    def delete_for_owner(self, owner_id: int, key: str) -> bool:
        deleted, _ = SavedBlockTemplateModel.objects.filter(
            owner_id=owner_id, key=key,
        ).delete()
        return deleted > 0
