"""پیاده‌سازی‌های concrete Repository (Django ORM).

هر کلاس، interface متناظر در ``domain/repositories`` را implement می‌کند
(Dependency Inversion). Composition Root (container) این‌ها را به Service ها
تزریق می‌کند.
"""
from .ai_model_repository import DjangoAIModelRepository
from .attachment_repository import DjangoAttachmentRepository
from .caching_ai_model_repository import CachingAIModelRepository
from .caching_role_prompt_profile_repository import (
    CachingRolePromptProfileRepository,
)
from .conversation_repository import DjangoConversationRepository
from .conversation_summary_repository import DjangoConversationSummaryRepository
from .message_repository import DjangoMessageRepository
from .role_prompt_profile_repository import DjangoRolePromptProfileRepository
from .usage_repository import DjangoUsageRepository

__all__ = [
    "CachingAIModelRepository",
    "CachingRolePromptProfileRepository",
    "DjangoAIModelRepository",
    "DjangoAttachmentRepository",
    "DjangoConversationRepository",
    "DjangoConversationSummaryRepository",
    "DjangoMessageRepository",
    "DjangoRolePromptProfileRepository",
    "DjangoUsageRepository",
]
