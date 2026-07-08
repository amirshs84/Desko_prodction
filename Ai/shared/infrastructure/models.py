"""Abstract Model Mixins — بلوک‌های ساختمانی مشترک همه‌ی مدل‌های concrete.

اینها همگی ``abstract = True`` هستند؛ یعنی هیچ جدولی نمی‌سازند و migration
تولید نمی‌کنند. مدل‌های واقعی در لایه‌های بعد (persistence) از ترکیب این‌ها ساخته
می‌شوند تا الگوهای cross-cutting (کلید UUIDv7، زمان‌ها، مستأجر، soft-delete،
قفل خوش‌بینانه، auditing) به‌صورت یکنواخت و بدون تکرار اعمال شوند.
"""
from __future__ import annotations

from django.db import models
from django.utils import timezone

from .ids import uuid7


class UUIDPrimaryKeyModel(models.Model):
    """کلید اصلی UUIDv7 (زمان‌مرتب) به‌جای BigAutoField."""

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    class Meta:
        abstract = True


class TimestampedModel(models.Model):
    """زمان‌های ساخت/به‌روزرسانی؛ همیشه UTC (به‌لطف USE_TZ)."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantScopedModel(models.Model):
    """محدوده‌ی مستأجر برای ایزولاسیون Multi-Tenant.

    ``tenant_id`` به‌صورت UUID ایندکس‌شده نگهداری می‌شود (نه FK سخت) تا این mixin
    مستقل و قابل استفاده‌ی مجدد بماند. یکپارچگی ارجاعی و RLS در سطح دیتابیس/مدل
    concrete اعمال می‌شود. همه‌ی queryها باید بر این ستون فیلتر شوند.
    """

    tenant_id = models.UUIDField(db_index=True, editable=False)

    class Meta:
        abstract = True


class VersionedModel(models.Model):
    """قفل خوش‌بینانه (Optimistic Locking) با شماره‌ی نسخه.

    هر به‌روزرسانی باید نسخه را با شرط ``WHERE version = <خوانده‌شده>`` افزایش
    دهد؛ اگر هیچ ردیفی تحت‌تأثیر قرار نگرفت یعنی تعارض همزمانی رخ داده است. منطق
    اجرای این شرط در Repository لایه ۵ پیاده می‌شود.
    """

    version = models.PositiveIntegerField(default=1)

    class Meta:
        abstract = True


class AuditableModel(models.Model):
    """ردپای ممیزی سبک: چه کسی ساخت/تغییر داد/حذف کرد.

    شناسه‌ها UUID و nullable هستند تا به مدل کاربر (اپ iam) گره سخت نخورند.
    """

    created_by = models.UUIDField(null=True, blank=True, editable=False)
    updated_by = models.UUIDField(null=True, blank=True, editable=False)
    deleted_by = models.UUIDField(null=True, blank=True, editable=False)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet آگاه از soft-delete.

    ``delete()`` به‌جای حذف فیزیکی، فیلد ``deleted_at`` را پر می‌کند تا داده برای
    بازیابی/ممیزی حفظ شود و درخت پیام‌ها نشکند. حذف فیزیکی (برای purge دوره‌ای)
    از طریق ``hard_delete()`` انجام می‌شود.
    """

    def alive(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=True)

    def dead(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=False)

    def delete(self):  # type: ignore[override]
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager):
    """مدیر پیش‌فرض که رکوردهای حذف‌شده را پنهان می‌کند."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            deleted_at__isnull=True
        )


class SoftDeletableModel(models.Model):
    """قابلیت حذف نرم با دو مدیر:

      - ``objects``     : فقط رکوردهای زنده (پیش‌فرض کوئری‌های کسب‌وکار).
      - ``all_objects`` : همه‌ی رکوردها (برای بازیابی/ممیزی/purge).

    نکته‌ی مهم: ``base_manager_name = "all_objects"`` تنظیم شده تا کوئری‌های
    مربوط به روابط (related lookups) و آبشار (cascade) رکوردهای soft-deleted را
    نادیده نگیرند — این از باگ‌های ظریف یکپارچگی داده جلوگیری می‌کند.
    """

    deleted_at = models.DateTimeField(
        null=True, blank=True, editable=False, db_index=True
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        abstract = True
        base_manager_name = "all_objects"

    def soft_delete(self, by=None) -> None:
        self.deleted_at = timezone.now()
        update_fields = ["deleted_at"]
        if by is not None and hasattr(self, "deleted_by"):
            self.deleted_by = by
            update_fields.append("deleted_by")
        self.save(update_fields=update_fields)

    def restore(self) -> None:
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])
