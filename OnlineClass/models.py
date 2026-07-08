from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

from api.models import SchoolClass, UserProfile


class OnlineClass(models.Model):
    """تخصیص کلاس آنلاین (اتاق اسکای‌روم) به یک کلاس درسی."""

    school_class = models.OneToOneField(
        SchoolClass,
        on_delete=models.CASCADE,
        related_name='online_class',
        verbose_name='کلاس درسی',
    )
    skyroom_room_id = models.PositiveIntegerField(verbose_name='شناسه اتاق اسکای‌روم')
    skyroom_room_name = models.CharField(max_length=128, verbose_name='نام اتاق')
    title = models.CharField(max_length=200, verbose_name='عنوان نمایشی')
    max_users = models.PositiveIntegerField(null=True, blank=True, verbose_name='سقف کاربر')
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_online_classes',
        verbose_name='ایجادکننده',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'کلاس آنلاین'
        verbose_name_plural = 'کلاس‌های آنلاین'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.school_class.code})'

    @property
    def school(self):
        return self.school_class.school


class SkyroomLoginCache(models.Model):
    """کش لینک ورود اسکای‌روم برای کاهش درخواست‌های تکراری."""

    online_class = models.ForeignKey(
        OnlineClass,
        on_delete=models.CASCADE,
        related_name='login_cache',
        verbose_name='کلاس آنلاین',
    )
    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='skyroom_login_cache',
        verbose_name='کاربر',
    )
    login_url = models.URLField(max_length=600, verbose_name='لینک ورود')
    access_level = models.PositiveSmallIntegerField(default=1, verbose_name='سطح دسترسی')
    expires_at = models.DateTimeField(verbose_name='زمان انقضا')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'کش لینک ورود اسکای‌روم'
        verbose_name_plural = 'کش لینک‌های ورود اسکای‌روم'
        constraints = [
            models.UniqueConstraint(
                fields=['online_class', 'profile', 'access_level'],
                name='unique_skyroom_login_per_user_class',
            )
        ]

    @property
    def is_valid(self) -> bool:
        buffer_seconds = int(getattr(settings, 'SKYROOM_LOGIN_CACHE_BUFFER', '120'))
        return self.expires_at > timezone.now() + timezone.timedelta(seconds=buffer_seconds)
