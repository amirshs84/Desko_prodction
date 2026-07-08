"""مدل‌های concrete Django (لایه‌ی ذخیره‌سازی).

این مدل‌ها «رکورد دیتابیس» هستند، نه موجودیت دامنه. نگاشت دوطرفه در mappers.py
انجام می‌شود تا ORM از دامنه بیرون درز نکند (مرز Clean Architecture).

نکات طراحی:
  - ارجاع بین Aggregateها با ``UUIDField`` است، نه ``ForeignKey``. چرا؟ حفظ
    مرز Aggregate، امکان بارگذاری/مقیاس مستقل، و اجتناب از cascadeهای ناخواسته.
    یکپارچگی ارجاعی در سطح منطق (Service/Repository) و در آینده RLS تضمین می‌شود.
  - همه‌ی مدل‌های کسب‌وکار ``tenant_id`` دارند (ایزولاسیون Multi-Tenant).
  - فیلدهای مختص PostgreSQL (tsvector/GIN، pgvector) عمداً اینجا نیستند تا مدل
    DB-agnostic بماند؛ در لایه‌های Search/Vector روی Postgres افزوده می‌شوند.
"""
from __future__ import annotations

from django.db import models

from ...shared.infrastructure.models import (
    AuditableModel,
    SoftDeletableModel,
    TimestampedModel,
    TenantScopedModel,
    UUIDPrimaryKeyModel,
    VersionedModel,
)


class AIModelModel(UUIDPrimaryKeyModel, TimestampedModel):
    """رجیستری مدل‌های هوش مصنوعی (سراسری، config-driven)."""

    provider_key = models.CharField(max_length=50)
    key = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=150)
    context_window = models.PositiveIntegerField()
    max_output_tokens = models.PositiveIntegerField()
    capabilities = models.JSONField(default=list)  # list[str] از Capability
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_model"
        indexes = [models.Index(fields=["is_active", "priority"])]


class ConversationModel(
    UUIDPrimaryKeyModel,
    TimestampedModel,
    TenantScopedModel,
    VersionedModel,
    SoftDeletableModel,
    AuditableModel,
):
    user_id = models.UUIDField(db_index=True, editable=False)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, default="active")
    is_pinned = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False)
    # ModelConfig (denormalized روی مکالمه).
    model_id = models.UUIDField()
    temperature = models.FloatField(default=0.7)
    top_p = models.FloatField(default=1.0)
    max_output_tokens = models.PositiveIntegerField(null=True, blank=True)
    # denormalized برای مرتب‌سازی لیست بدون JOIN.
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "conversation"
        base_manager_name = "all_objects"
        indexes = [
            # لیست مکالمات کاربر، pinned بالا، جدیدترین اول.
            models.Index(
                fields=["tenant_id", "user_id", "-is_pinned", "-last_message_at"],
                name="conv_list_idx",
            ),
            # ایندکس جزئی برای فهرست علاقه‌مندی‌ها.
            models.Index(
                fields=["tenant_id", "user_id"],
                condition=models.Q(is_favorite=True),
                name="conv_fav_idx",
            ),
        ]


class MessageModel(
    UUIDPrimaryKeyModel,
    TimestampedModel,
    TenantScopedModel,
    VersionedModel,
    SoftDeletableModel,
):
    conversation_id = models.UUIDField(db_index=True, editable=False)
    role = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    seq = models.PositiveIntegerField()
    parent_id = models.UUIDField(null=True, blank=True)
    quoted_message_id = models.UUIDField(null=True, blank=True)
    thread_root_id = models.UUIDField(null=True, blank=True, db_index=True)
    model_id = models.UUIDField(null=True, blank=True)
    active_version_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "message"
        base_manager_name = "all_objects"
        constraints = [
            # ترتیب پایدار و بدون تکرار در هر مکالمه (seq هرگز بازاستفاده نمی‌شود).
            models.UniqueConstraint(
                fields=["conversation_id", "seq"], name="uniq_message_seq"
            ),
        ]
        indexes = [
            models.Index(fields=["conversation_id", "seq"], name="msg_conv_seq_idx"),
            models.Index(fields=["parent_id"], name="msg_parent_idx"),
            # یافتن سریع پیام‌های در حال پردازش (برای recovery).
            models.Index(
                fields=["conversation_id"],
                condition=models.Q(status="pending"),
                name="msg_pending_idx",
            ),
        ]


class MessageVersionModel(UUIDPrimaryKeyModel, TimestampedModel):
    message_id = models.UUIDField(db_index=True, editable=False)
    version_no = models.PositiveIntegerField()
    content = models.TextField()
    finish_reason = models.CharField(max_length=50, null=True, blank=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "message_version"
        constraints = [
            models.UniqueConstraint(
                fields=["message_id", "version_no"], name="uniq_message_version"
            ),
        ]


class AttachmentModel(
    UUIDPrimaryKeyModel,
    TimestampedModel,
    TenantScopedModel,
    SoftDeletableModel,
    AuditableModel,
):
    user_id = models.UUIDField(db_index=True, editable=False)
    file_type = models.CharField(max_length=20)
    bucket = models.CharField(max_length=100)
    storage_key = models.CharField(max_length=500)
    checksum_sha256 = models.CharField(max_length=64)
    size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=150)
    parse_status = models.CharField(max_length=20, default="uploaded")
    extracted_text = models.TextField(null=True, blank=True)
    failure_reason = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "attachment"
        base_manager_name = "all_objects"
        indexes = [
            # deduplication بر اساس checksum در محدوده‌ی مستأجر.
            models.Index(
                fields=["tenant_id", "checksum_sha256"], name="att_checksum_idx"
            ),
        ]


class RolePromptProfileModel(UUIDPrimaryKeyModel, TimestampedModel):
    # tenant_id nullable است: None یعنی پیش‌فرض سراسری، مقدار یعنی override مستأجر.
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
    role = models.CharField(max_length=20)
    system_prompt = models.TextField()
    parameters = models.JSONField(default=dict)
    guardrails = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "role_prompt_profile"
        indexes = [
            models.Index(
                fields=["role", "tenant_id", "is_active"], name="rpp_resolve_idx"
            ),
        ]


class ConversationSummaryModel(
    UUIDPrimaryKeyModel, TimestampedModel, TenantScopedModel
):
    """خلاصه‌ی rolling مکالمه (برای مدیریت پنجره‌ی context)."""

    conversation_id = models.UUIDField(db_index=True, editable=False)
    up_to_seq = models.PositiveIntegerField()
    summary = models.TextField()
    token_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "conversation_summary"
        indexes = [
            models.Index(
                fields=["conversation_id", "-up_to_seq"], name="summary_latest_idx"
            ),
        ]


class DocumentChunkModel(
    UUIDPrimaryKeyModel, TimestampedModel, TenantScopedModel, SoftDeletableModel
):
    """قطعه‌ی متنی پیوست + بردار تعبیه.

    در dev بردار به‌صورت JSON (list[float]) ذخیره می‌شود تا با SQLite کار کند؛
    در prod این ستون با ``vector`` از افزونه‌ی pgvector و ایندکس HNSW/IVFFlat
    جایگزین می‌شود (پشت همان Port ``VectorStore``).
    """

    attachment_id = models.UUIDField(db_index=True, editable=False)
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    token_count = models.PositiveIntegerField(default=0)
    embedding = models.JSONField(default=list)  # list[float]
    dim = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "document_chunk"
        base_manager_name = "all_objects"
        constraints = [
            models.UniqueConstraint(
                fields=["attachment_id", "chunk_index"], name="uniq_chunk_index"
            ),
        ]
        indexes = [
            models.Index(fields=["tenant_id", "attachment_id"], name="chunk_att_idx"),
        ]


class UsageRecordModel(UUIDPrimaryKeyModel, TimestampedModel, TenantScopedModel):
    """لاگ مصرف؛ append-only و بدون soft-delete (یکپارچگی مالی)."""

    user_id = models.UUIDField(db_index=True, editable=False)
    message_id = models.UUIDField(db_index=True, editable=False)
    model_id = models.UUIDField()
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    currency = models.CharField(max_length=3, default="USD")

    class Meta:
        db_table = "usage_record"
        indexes = [
            models.Index(
                fields=["tenant_id", "user_id", "created_at"], name="usage_period_idx"
            ),
        ]
