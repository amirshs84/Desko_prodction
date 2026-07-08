"""Services — هماهنگ‌کننده‌ی Use-Case ها (Service Layer).

هر Service وابستگی‌هایش را از طریق سازنده تزریق‌شده می‌گیرد (Dependency
Injection) و هرگز آن‌ها را new نمی‌کند.
"""
from .attachment_ingestion_service import AttachmentIngestionService
from .attachment_service import AttachmentService
from .context_manager import ContextManager
from .conversation_service import ConversationService
from .generation_service import GenerationService
from .message_query_service import MessageQueryService
from .message_service import MessageService
from .quota_service import QuotaService
from .rag_service import RagService
from .send_message_service import SendMessageService
from .summarization_service import SummarizationService
from .vector_search_service import VectorSearchService

__all__ = [
    "AttachmentIngestionService",
    "AttachmentService",
    "ContextManager",
    "ConversationService",
    "GenerationService",
    "MessageQueryService",
    "MessageService",
    "QuotaService",
    "RagService",
    "SendMessageService",
    "SummarizationService",
    "VectorSearchService",
]
