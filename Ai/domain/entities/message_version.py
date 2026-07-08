"""MessageVersion — یک نسخه از محتوای پیام (Entity درون Aggregate پیام).

چرا نسخه جداست؟ تا Edit و Regenerate بدون از دست دادن تاریخچه ممکن شود:
هر ویرایش/تولید مجدد یک MessageVersion جدید می‌سازد و پیام صرفاً به «نسخه‌ی
فعال» اشاره می‌کند. این هم قابلیت جابه‌جایی بین نسخه‌ها (1/3 ◄ ►) را می‌دهد و هم
ممیزی طبیعی محتوا را.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.entity import Entity
from ..value_objects.token_usage import TokenUsage


@dataclass(eq=False)
class MessageVersion(Entity):
    id: UUID
    message_id: UUID
    version_no: int
    content: str
    finish_reason: str | None = None
    usage: TokenUsage | None = None
