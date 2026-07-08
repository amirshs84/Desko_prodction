"""Django Admin اپ Ai (لایه ۱۸).

دو دسته:
  ۱) داده‌ی config-driven قابل‌ویرایش: مدل‌های هوش مصنوعی و پروفایل‌های پرامپت
     نقش‌محور — با ابطال خودکار کش پس از ذخیره/حذف (سازگاری با لایه ۱۷).
  ۲) داده‌ی عملیاتی فقط‌خواندنی: مکالمه/پیام/نسخه/پیوست/خلاصه/قطعه/مصرف — برای
     مشاهده و ممیزی، بدون امکان دستکاری دستی (یکپارچگی دامنه از مسیر سرویس‌ها
     حفظ می‌شود، نه از Admin).

نکته‌ی معماری: Admin فقط یک «رابط مدیریتی روی مدل‌های ذخیره‌سازی» است و منطق
کسب‌وکار در آن نوشته نمی‌شود؛ تنها استثناء، فراخوانی ابطال کش است که یک نگرانی
infrastructure است.
"""
from __future__ import annotations

from django.contrib import admin

from .container import get_container
from .domain.enums import UserRole
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


class ReadOnlyModelAdmin(admin.ModelAdmin):
    """پایه‌ی Admin فقط‌خواندنی.

    افزودن/ویرایش/حذف غیرفعال است؛ کاربر با مجوز «view» می‌تواند فهرست و جزئیات
    را ببیند (پشتیبانی داخلی Django از حالت view-only). برای مدل‌های soft-delete،
    رکوردهای حذف‌شده هم برای ممیزی نمایش داده می‌شوند (``all_objects``).
    """

    def get_queryset(self, request):
        manager = getattr(self.model, "all_objects", self.model._default_manager)
        return manager.get_queryset()

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# config-driven — قابل‌ویرایش با ابطال کش
# ---------------------------------------------------------------------------


@admin.register(AIModelModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "key",
        "provider_key",
        "context_window",
        "max_output_tokens",
        "priority",
        "is_active",
    )
    list_filter = ("provider_key", "is_active")
    search_fields = ("key", "display_name", "provider_key")
    ordering = ("-priority", "key")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        self._invalidate(obj)

    def delete_model(self, request, obj):
        super().delete_model(request, obj)
        self._invalidate(obj)

    def delete_queryset(self, request, queryset):
        objs = list(queryset)
        super().delete_queryset(request, queryset)
        for obj in objs:
            self._invalidate(obj)

    @staticmethod
    def _invalidate(obj) -> None:
        repo = get_container().model_repo
        if hasattr(repo, "invalidate"):
            repo.invalidate(model_id=obj.id, key=obj.key)


@admin.register(RolePromptProfileModel)
class RolePromptProfileAdmin(admin.ModelAdmin):
    list_display = ("role", "tenant_scope", "version", "is_active", "updated_at")
    list_filter = ("role", "is_active")
    search_fields = ("system_prompt",)
    ordering = ("role", "-version")

    @admin.display(description="محدوده")
    def tenant_scope(self, obj) -> str:
        return "سراسری" if obj.tenant_id is None else str(obj.tenant_id)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        self._invalidate(obj)

    def delete_model(self, request, obj):
        super().delete_model(request, obj)
        self._invalidate(obj)

    def delete_queryset(self, request, queryset):
        objs = list(queryset)
        super().delete_queryset(request, queryset)
        for obj in objs:
            self._invalidate(obj)

    @staticmethod
    def _invalidate(obj) -> None:
        repo = get_container().profile_repo
        if not hasattr(repo, "invalidate"):
            return
        try:
            role = UserRole(obj.role)
        except ValueError:
            return
        repo.invalidate(role=role, tenant_id=obj.tenant_id)


# ---------------------------------------------------------------------------
# داده‌ی عملیاتی — فقط‌خواندنی
# ---------------------------------------------------------------------------


@admin.register(ConversationModel)
class ConversationAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "tenant_id", "user_id", "title", "status", "is_pinned", "is_favorite", "created_at")
    list_filter = ("status", "is_pinned", "is_favorite")
    search_fields = ("id", "title", "user_id")
    date_hierarchy = "created_at"


@admin.register(MessageModel)
class MessageAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "conversation_id", "role", "status", "seq", "created_at")
    list_filter = ("role", "status")
    search_fields = ("id", "conversation_id")


@admin.register(MessageVersionModel)
class MessageVersionAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "message_id", "version_no", "finish_reason", "prompt_tokens", "completion_tokens")
    search_fields = ("id", "message_id")


@admin.register(AttachmentModel)
class AttachmentAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "tenant_id", "user_id", "file_type", "parse_status", "size_bytes", "created_at")
    list_filter = ("file_type", "parse_status")
    search_fields = ("id", "checksum_sha256", "user_id")


@admin.register(ConversationSummaryModel)
class ConversationSummaryAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "conversation_id", "up_to_seq", "token_count", "created_at")
    search_fields = ("id", "conversation_id")


@admin.register(DocumentChunkModel)
class DocumentChunkAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "tenant_id", "attachment_id", "chunk_index", "token_count", "dim")
    search_fields = ("id", "attachment_id")


@admin.register(UsageRecordModel)
class UsageRecordAdmin(ReadOnlyModelAdmin):
    list_display = ("id", "tenant_id", "user_id", "model_id", "prompt_tokens", "completion_tokens", "cost", "currency", "created_at")
    list_filter = ("currency",)
    search_fields = ("id", "user_id", "message_id")
    date_hierarchy = "created_at"
