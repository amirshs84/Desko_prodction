"""پورت ذخیره‌ی بلوک‌های آماده‌ی شخصی مشاور."""
from __future__ import annotations

from typing import Protocol

from ..value_objects.block_template import BlockTemplate


class BlockTemplateRepository(Protocol):
    def list_for_owner(self, owner_id: int) -> tuple[BlockTemplate, ...]:
        ...

    def get_for_owner(self, owner_id: int, key: str) -> BlockTemplate | None:
        ...

    def save(self, owner_id: int, template: BlockTemplate) -> BlockTemplate:
        ...

    def delete_for_owner(self, owner_id: int, key: str) -> bool:
        ...
