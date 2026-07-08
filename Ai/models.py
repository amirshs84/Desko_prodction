"""نقطه‌ی کشف مدل‌ها توسط Django.

طبق Clean Architecture، تعریف مدل‌ها در ``infrastructure/persistence/models.py``
است. Django به‌صورت خودکار فقط ``<app>/models.py`` را import می‌کند؛ بنابراین
اینجا آن‌ها را بازصادر می‌کنیم تا در رجیستری اپ ``Ai`` ثبت و migration بگیرند،
بدون آنکه منطق دامنه به این ماژول نشت کند.
"""
from .infrastructure.persistence.models import (
    AIModelModel,
    AttachmentModel,
    ConversationModel,
    ConversationSummaryModel,
    DocumentChunkModel,
    MessageModel,
    MessageVersionModel,
    RolePromptProfileModel,
    UsageRecordModel,
)

__all__ = [
    "AIModelModel",
    "AttachmentModel",
    "ConversationModel",
    "ConversationSummaryModel",
    "DocumentChunkModel",
    "MessageModel",
    "MessageVersionModel",
    "RolePromptProfileModel",
    "UsageRecordModel",
]
