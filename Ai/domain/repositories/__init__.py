"""Repository Interfaces — فقط قراردادها (Ports خروجی دامنه).

پیاده‌سازی واقعی (با Django ORM) در infrastructure/persistence قرار می‌گیرد و
این interfaceها را implement می‌کند (Dependency Inversion — حرف D در SOLID).
"""
from .ai_model_repository import AIModelRepository
from .attachment_repository import AttachmentRepository
from .conversation_repository import ConversationFilter, ConversationRepository
from .conversation_summary_repository import ConversationSummaryRepository
from .message_repository import MessageRepository
from .role_prompt_profile_repository import RolePromptProfileRepository
from .usage_repository import UsageRepository

__all__ = [
    "AIModelRepository",
    "AttachmentRepository",
    "ConversationFilter",
    "ConversationRepository",
    "ConversationSummaryRepository",
    "MessageRepository",
    "RolePromptProfileRepository",
    "UsageRepository",
]
