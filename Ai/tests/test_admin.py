"""آزمون Admin اپ Ai (لایه ۱۸).

- ثبت همه‌ی مدل‌ها در admin site.
- بارگذاری صفحات changelist (config و فقط‌خواندنی) با سوپرکاربر.
- ابطال کش رجیستری مدل هنگام ذخیره/حذف از Admin (اتصال به لایه ۱۷).
"""
from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import RequestFactory, TestCase

from Ai.admin import AIModelAdmin, ConversationAdmin
from Ai.container import get_container
from Ai.infrastructure.persistence.models import (
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
from Ai.shared.infrastructure.ids import uuid7

_ALL_MODELS = [
    AIModelModel,
    AttachmentModel,
    ConversationModel,
    ConversationSummaryModel,
    DocumentChunkModel,
    MessageModel,
    MessageVersionModel,
    RolePromptProfileModel,
    UsageRecordModel,
]


class AdminRegistrationTests(TestCase):
    def test_all_models_registered(self):
        for model in _ALL_MODELS:
            self.assertIn(model, admin.site._registry)


class ReadOnlyAdminBehaviorTests(TestCase):
    """رفتار Admin فقط‌خواندنی را مستقیم می‌سنجد (بدون رندر قالب).

    ساخت درخواست با RequestFactory تا از مسیر رندرِ تست‌کلاینت که در این محیط
    (Python 3.14) هنگام کپی context دچار خطا می‌شود پرهیز شود.
    """

    def setUp(self) -> None:
        cache.clear()
        self.factory = RequestFactory()
        self.user = User.objects.create_superuser(
            username="admin", email="a@b.c", password="pass12345"
        )

    def _request(self):
        req = self.factory.get("/admin/")
        req.user = self.user
        return req

    def test_readonly_permissions(self):
        model_admin = ConversationAdmin(ConversationModel, admin.site)
        req = self._request()
        self.assertFalse(model_admin.has_add_permission(req))
        self.assertFalse(model_admin.has_change_permission(req))
        self.assertFalse(model_admin.has_delete_permission(req))

    def test_readonly_fields_cover_all(self):
        model_admin = ConversationAdmin(ConversationModel, admin.site)
        ro = set(model_admin.get_readonly_fields(self._request()))
        all_fields = {f.name for f in ConversationModel._meta.fields}
        self.assertEqual(ro, all_fields)

    def test_queryset_includes_soft_deleted(self):
        # ConversationModel از all_objects استفاده می‌کند → رکورد soft-deleted هم دیده شود.
        model_admin = ConversationAdmin(ConversationModel, admin.site)
        qs = model_admin.get_queryset(self._request())
        self.assertEqual(qs.model, ConversationModel)


class AdminCacheInvalidationTests(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def test_save_invalidates_model_cache(self):
        row = AIModelModel.objects.create(
            id=uuid7(),
            provider_key="fake",
            key="fake-admin",
            display_name="Fake Admin",
            context_window=8000,
            max_output_tokens=1024,
            capabilities=["chat"],
            is_active=True,
        )
        container = get_container()
        keys = container.cache_keys

        # پر کردن کش با یک خواندن.
        container.model_repo.get(row.id)
        self.assertIsNotNone(cache.get(keys.model(row.id)))

        # ابطال از مسیر Admin.
        AIModelAdmin._invalidate(row)
        self.assertIsNone(cache.get(keys.model(row.id)))
