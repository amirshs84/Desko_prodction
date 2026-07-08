"""دسترسی متمرکز و امن به تنظیمات زیرساخت اپ Ai.

به‌جای پراکندن ``getattr(settings, ...)`` در سراسر کد، همه‌ی تنظیمات با پیشوند
``AI_`` اینجا با مقادیر پیش‌فرض امن جمع می‌شوند. این کار:
  - import-safe است: نبودِ تنظیمات (مثلاً در حالت توسعه بدون Redis) پروژه را
    نمی‌شکند؛ صرفاً پیش‌فرض استفاده می‌شود.
  - تک‌منبع حقیقت برای نام کلیدهای تنظیمات فراهم می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


def _get(name: str, default):
    return getattr(settings, name, default)


@dataclass(frozen=True)
class InfraConfig:
    # namespace کلیدهای کش (برای جداسازی از اپ‌های دیگر روی همان Redis).
    cache_namespace: str = "ai"
    # TTL پیش‌فرض کش (ثانیه).
    default_cache_ttl: int = 300
    # فعال‌سازی کش read-through روی رجیستری مدل و پروفایل پرامپت (لایه ۱۷).
    cache_enabled: bool = True
    # TTL کش داده‌ی config-driven (مدل‌ها/پروفایل‌ها) که به‌ندرت تغییر می‌کنند.
    config_cache_ttl: int = 300
    # سقف پیش‌فرض تعداد پیام روزانه‌ی هر کاربر (تا زمان افزودن QuotaPolicy کامل).
    daily_message_limit: int = 1000
    # مدیریت context.
    default_max_output_tokens: int = 1024  # وقتی مکالمه مقداری تعیین نکرده.
    context_safety_margin: int = 512  # حاشیه‌ی امن برای جلوگیری از سرریز پنجره.
    context_recent_limit: int = 50  # حداکثر پیام اخیر که برای بودجه‌بندی اسکن می‌شود.
    # خلاصه‌سازی.
    summary_trigger_ratio: float = 0.6  # اگر توکن تاریخچه از این نسبتِ پنجره گذشت.
    summary_scan_limit: int = 500  # سقف پیام برای اسکن هنگام ساخت خلاصه.
    # نام صف‌های Celery (لایه ۱۶).
    queue_ai: str = "ai_generation"
    queue_files: str = "file_ingestion"
    queue_embeddings: str = "embeddings"
    queue_maintenance: str = "maintenance"
    # استریم و تولید (لایه ۱۵/۱۶).
    stream_channel_prefix: str = "stream"
    generation_mode: str = "inline"  # inline | celery
    stream_transport: str = "memory"  # memory | redis
    stream_timeout: int = 60  # سقف انتظار consumer روی حامل (ثانیه)
    redis_url: str = "redis://localhost:6379/0"
    # پیوست‌ها (لایه ۱۱).
    attachment_bucket: str = "attachments"
    max_attachment_size_bytes: int = 25 * 1024 * 1024  # ۲۵ مگابایت
    storage_root: str = ".ai_storage"  # مسیر ذخیره‌ی محلی (dev)؛ در prod → S3/MinIO
    # جست‌وجوی برداری (لایه ۱۲).
    chunk_size: int = 1000
    chunk_overlap: int = 150
    rag_top_k: int = 5
    rag_min_score: float = 0.0  # آستانه‌ی شباهت برای فیلتر قطعات نامرتبط


def load_config() -> InfraConfig:
    return InfraConfig(
        cache_namespace=_get("AI_CACHE_NAMESPACE", "ai"),
        default_cache_ttl=_get("AI_DEFAULT_CACHE_TTL", 300),
        cache_enabled=_get("AI_CACHE_ENABLED", True),
        config_cache_ttl=_get("AI_CONFIG_CACHE_TTL", 300),
        daily_message_limit=_get("AI_DAILY_MESSAGE_LIMIT", 1000),
        default_max_output_tokens=_get("AI_DEFAULT_MAX_OUTPUT_TOKENS", 1024),
        context_safety_margin=_get("AI_CONTEXT_SAFETY_MARGIN", 512),
        context_recent_limit=_get("AI_CONTEXT_RECENT_LIMIT", 50),
        summary_trigger_ratio=_get("AI_SUMMARY_TRIGGER_RATIO", 0.6),
        summary_scan_limit=_get("AI_SUMMARY_SCAN_LIMIT", 500),
        queue_ai=_get("AI_QUEUE_GENERATION", "ai_generation"),
        queue_files=_get("AI_QUEUE_FILES", "file_ingestion"),
        queue_embeddings=_get("AI_QUEUE_EMBEDDINGS", "embeddings"),
        queue_maintenance=_get("AI_QUEUE_MAINTENANCE", "maintenance"),
        stream_channel_prefix=_get("AI_STREAM_CHANNEL_PREFIX", "stream"),
        generation_mode=_get("AI_GENERATION_MODE", "inline"),
        stream_transport=_get("AI_STREAM_TRANSPORT", "memory"),
        stream_timeout=_get("AI_STREAM_TIMEOUT", 60),
        redis_url=_get("AI_REDIS_URL", "redis://localhost:6379/0"),
        attachment_bucket=_get("AI_ATTACHMENT_BUCKET", "attachments"),
        max_attachment_size_bytes=_get(
            "AI_MAX_ATTACHMENT_SIZE_BYTES", 25 * 1024 * 1024
        ),
        storage_root=_get("AI_STORAGE_ROOT", ".ai_storage"),
        chunk_size=_get("AI_CHUNK_SIZE", 1000),
        chunk_overlap=_get("AI_CHUNK_OVERLAP", 150),
        rag_top_k=_get("AI_RAG_TOP_K", 5),
        rag_min_score=_get("AI_RAG_MIN_SCORE", 0.0),
    )
