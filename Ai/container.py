"""Composition Root — نقطه‌ی مرکزی Dependency Injection اپ Ai.

تنها جایی که پیاده‌سازی‌های concrete ساخته و به Service ها تزریق می‌شوند.
لایه‌های domain/application فقط به interface وابسته‌اند؛ این فایل آن‌ها را به
پیاده‌سازی‌های infrastructure «سیم‌کشی» می‌کند.

چرا Container متمرکز و lazy (singleton)؟
  - تست‌پذیری: در تست می‌توان یک Container ساخت و وابستگی‌ها (مثل صف یا کش) را
    با نسخه‌ی ساختگی جایگزین کرد.
  - جایگزین‌پذیری: تعویض یک پیاده‌سازی فقط همین‌جا تغییر می‌کند.

نکته: Repository ها و آداپتورها بدون state هستند و می‌توانند singleton باشند.
Unit of Work اما per-operation ساخته می‌شود (مرز تراکنش)، پس به‌صورت factory
تزریق می‌گردد.
"""
from __future__ import annotations

from functools import cached_property

from .application.services import (
    AttachmentIngestionService,
    AttachmentService,
    ContextManager,
    ConversationService,
    GenerationService,
    MessageQueryService,
    MessageService,
    QuotaService,
    RagService,
    SendMessageService,
    SummarizationService,
    VectorSearchService,
)
from .infrastructure.cache import CacheKeys, DjangoCacheClient
from .infrastructure.config import load_config
from .infrastructure.context import HeuristicTokenCounter
from .infrastructure.events import InProcessEventDispatcher
from .infrastructure.extraction import build_default_extractor
from .infrastructure.persistence.repositories import (
    CachingAIModelRepository,
    CachingRolePromptProfileRepository,
    DjangoAIModelRepository,
    DjangoAttachmentRepository,
    DjangoConversationRepository,
    DjangoConversationSummaryRepository,
    DjangoMessageRepository,
    DjangoRolePromptProfileRepository,
    DjangoUsageRepository,
)
from .infrastructure.providers import ProviderFactory
from .infrastructure.providers.fake import FakeEmbeddingProvider
from .infrastructure.storage import LocalObjectStorage
from .infrastructure.unit_of_work import DjangoUnitOfWork
from .infrastructure.vector import DjangoVectorStore, TextChunker
from .shared.infrastructure.clock import SystemClock


class Container:
    def __init__(self) -> None:
        self.config = load_config()

    # ---------- زیرساخت پایه (singleton) ----------

    @cached_property
    def clock(self) -> SystemClock:
        return SystemClock()

    @cached_property
    def cache(self) -> DjangoCacheClient:
        return DjangoCacheClient()

    @cached_property
    def cache_keys(self) -> CacheKeys:
        return CacheKeys(self.config.cache_namespace)

    @cached_property
    def events(self) -> InProcessEventDispatcher:
        return InProcessEventDispatcher()

    @cached_property
    def stream_transport(self):
        """حامل رویداد استریم؛ بر اساس config انتخاب می‌شود (memory | redis)."""
        if self.config.stream_transport == "redis":
            from .infrastructure.streaming.redis_stream import RedisStreamTransport

            return RedisStreamTransport(self.config.redis_url)
        from .infrastructure.streaming import InMemoryStreamTransport

        return InMemoryStreamTransport()

    @cached_property
    def generation_runner(self):
        from .infrastructure.streaming import GenerationRunner

        return GenerationRunner(
            generation_service=self.generation_service,
            transport=self.stream_transport,
            channel_prefix=self.config.stream_channel_prefix,
        )

    @cached_property
    def generation_queue(self):
        """صف تولید؛ inline (dev/test) یا celery (prod)."""
        if self.config.generation_mode == "celery":
            from .infrastructure.queue import CeleryGenerationQueue

            return CeleryGenerationQueue(queue=self.config.queue_ai)
        from .infrastructure.queue import InlineGenerationQueue

        return InlineGenerationQueue(runner_provider=lambda: self.generation_runner)

    def stream_channel(self, message_id) -> str:
        return self.generation_runner.channel(message_id)

    @cached_property
    def object_storage(self) -> LocalObjectStorage:
        # در prod با آداپتور S3/MinIO (پشت همان Port) جایگزین می‌شود.
        return LocalObjectStorage(self.config.storage_root)

    @cached_property
    def vector_store(self) -> DjangoVectorStore:
        # در prod با آداپتور pgvector (پشت همان Port) جایگزین می‌شود.
        return DjangoVectorStore()

    @cached_property
    def embedding_provider(self) -> FakeEmbeddingProvider:
        # در prod با آداپتور واقعی (OpenAI/local) جایگزین می‌شود.
        return FakeEmbeddingProvider()

    @cached_property
    def chunker(self) -> TextChunker:
        return TextChunker(
            chunk_size=self.config.chunk_size, overlap=self.config.chunk_overlap
        )

    @cached_property
    def text_extractor(self):
        return build_default_extractor()

    @cached_property
    def provider_factory(self) -> ProviderFactory:
        # config هر Provider (کلید API، base_url) از settings خوانده می‌شود؛
        # نمونه: AI_PROVIDERS = {"openai": {"api_key": "..."}}
        from django.conf import settings

        provider_configs = getattr(settings, "AI_PROVIDERS", {})
        return ProviderFactory(provider_configs=provider_configs)

    # ---------- Repository ها (singleton، بدون state) ----------

    @cached_property
    def conversation_repo(self) -> DjangoConversationRepository:
        return DjangoConversationRepository()

    @cached_property
    def message_repo(self) -> DjangoMessageRepository:
        return DjangoMessageRepository()

    @cached_property
    def attachment_repo(self) -> DjangoAttachmentRepository:
        return DjangoAttachmentRepository()

    @cached_property
    def model_repo(self):
        """رجیستری مدل‌ها؛ در صورت فعال بودن کش، با دکوراتور read-through پیچیده
        می‌شود (شفاف برای مصرف‌کننده‌ها)."""
        base = DjangoAIModelRepository()
        if not self.config.cache_enabled:
            return base
        return CachingAIModelRepository(
            base,
            cache=self.cache,
            keys=self.cache_keys,
            ttl_seconds=self.config.config_cache_ttl,
        )

    @cached_property
    def profile_repo(self):
        """پروفایل پرامپت نقش‌ها؛ با کش read-through (+ ابطال روی save)."""
        base = DjangoRolePromptProfileRepository()
        if not self.config.cache_enabled:
            return base
        return CachingRolePromptProfileRepository(
            base,
            cache=self.cache,
            keys=self.cache_keys,
            ttl_seconds=self.config.config_cache_ttl,
        )

    @cached_property
    def usage_repo(self) -> DjangoUsageRepository:
        return DjangoUsageRepository()

    @cached_property
    def summary_repo(self) -> DjangoConversationSummaryRepository:
        return DjangoConversationSummaryRepository()

    # ---------- کمکی‌های context ----------

    @cached_property
    def token_counter(self) -> HeuristicTokenCounter:
        # در آینده با tokenizer دقیق (tiktoken) پشت همان Port جایگزین می‌شود.
        return HeuristicTokenCounter()

    # ---------- Unit of Work (factory، per-operation) ----------

    def unit_of_work(self) -> DjangoUnitOfWork:
        return DjangoUnitOfWork(self.events)

    # ---------- Service ها ----------

    @cached_property
    def quota_service(self) -> QuotaService:
        return QuotaService(
            cache=self.cache,
            keys=self.cache_keys,
            clock=self.clock,
            daily_limit=self.config.daily_message_limit,
        )

    @cached_property
    def conversation_service(self) -> ConversationService:
        return ConversationService(
            conversation_repo=self.conversation_repo,
            model_repo=self.model_repo,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def message_query_service(self) -> MessageQueryService:
        return MessageQueryService(message_repo=self.message_repo)

    @cached_property
    def message_service(self) -> MessageService:
        return MessageService(
            message_repo=self.message_repo,
            generation_queue=self.generation_queue,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def attachment_service(self) -> AttachmentService:
        return AttachmentService(
            attachment_repo=self.attachment_repo,
            storage=self.object_storage,
            uow_factory=self.unit_of_work,
            bucket=self.config.attachment_bucket,
            max_size_bytes=self.config.max_attachment_size_bytes,
        )

    @cached_property
    def vector_search_service(self) -> VectorSearchService:
        return VectorSearchService(
            vector_store=self.vector_store,
            embedding_provider=self.embedding_provider,
            chunker=self.chunker,
            default_top_k=self.config.rag_top_k,
        )

    @cached_property
    def attachment_ingestion_service(self) -> AttachmentIngestionService:
        return AttachmentIngestionService(
            attachment_repo=self.attachment_repo,
            storage=self.object_storage,
            extractor=self.text_extractor,
            vector_search=self.vector_search_service,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def rag_service(self) -> RagService:
        return RagService(
            vector_search=self.vector_search_service,
            min_score=self.config.rag_min_score,
            max_blocks=self.config.rag_top_k,
        )

    @cached_property
    def context_manager(self) -> ContextManager:
        return ContextManager(
            message_repo=self.message_repo,
            profile_repo=self.profile_repo,
            model_repo=self.model_repo,
            summary_repo=self.summary_repo,
            token_counter=self.token_counter,
            default_max_output_tokens=self.config.default_max_output_tokens,
            safety_margin=self.config.context_safety_margin,
            recent_limit=self.config.context_recent_limit,
        )

    @cached_property
    def summarization_service(self) -> SummarizationService:
        return SummarizationService(
            message_repo=self.message_repo,
            summary_repo=self.summary_repo,
            model_repo=self.model_repo,
            provider_factory=self.provider_factory,
            token_counter=self.token_counter,
            trigger_ratio=self.config.summary_trigger_ratio,
            scan_limit=self.config.summary_scan_limit,
        )

    @cached_property
    def generation_service(self) -> GenerationService:
        return GenerationService(
            conversation_repo=self.conversation_repo,
            message_repo=self.message_repo,
            model_repo=self.model_repo,
            context_manager=self.context_manager,
            provider_factory=self.provider_factory,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def send_message_service(self) -> SendMessageService:
        return SendMessageService(
            conversation_repo=self.conversation_repo,
            message_repo=self.message_repo,
            quota_service=self.quota_service,
            generation_queue=self.generation_queue,
            cache=self.cache,
            cache_keys=self.cache_keys,
            uow_factory=self.unit_of_work,
        )


_container: Container | None = None


def get_container() -> Container:
    """دسترسی singleton به Container (lazy)."""
    global _container
    if _container is None:
        _container = Container()
    return _container
