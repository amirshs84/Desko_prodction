"""Port: تولید شناسه.

شناسه‌ی رویدادها (``client_id``) و شناسه‌ی گروه، مقدارهای تصادفی‌اند. با تزریق این
پورت، use-case ها در تست قابل پیش‌بینی می‌شوند و منطق به ``uuid4`` گره نمی‌خورد.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class IdGenerator(Protocol):
    def new_id(self) -> str:
        """یک شناسه‌ی یکتای حداکثر ۶۴ نویسه‌ای."""
        ...
