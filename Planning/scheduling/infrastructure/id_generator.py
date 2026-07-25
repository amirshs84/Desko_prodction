"""پیاده‌سازی تولید شناسه با UUID4."""
from __future__ import annotations

from uuid import uuid4


class Uuid4IdGenerator:
    def new_id(self) -> str:
        return uuid4().hex
