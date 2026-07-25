"""مدل‌های Django کانتکست تقویم — «شکل دیتابیس»، نه دامنه.

این کلاس‌ها فقط ذخیره‌سازی را توصیف می‌کنند و هیچ قاعده‌ی کسب‌وکاری ندارند؛ قواعد
در ``scheduling/domain`` است و ترجمه‌ی بین این دو در ``mappers.py``.

``db_table`` صریح نوشته شده چون نام اپ حرف بزرگ دارد (``Planning``) و جدول در
مایگریشن انتقال از اپ ``api`` با حروف کوچک ساخته شده است؛ در PostgreSQL که
حساس به بزرگی و کوچکی حروف است، بدون این تنظیم کوئری‌ها می‌شکنند.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.db import models

from ...domain.enums import EventKind, EventOrigin
from ...domain.value_objects.time_range import MINUTES_IN_DAY


class SavedBlockTemplateModel(models.Model):
    """بلوک آماده‌ی شخصی مشاور — علاوه بر کاتالوگ ثابت سیستم.

    هر مشاور فقط قالب‌های خودش را می‌بیند و ویرایش می‌کند. ``key`` شناسه‌ی پایدار
    برای درگ‌اند‌دراپ و ``POST .../blocks/`` است.
    """

    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='saved_block_templates',
        verbose_name='مشاور',
    )
    key = models.CharField(max_length=64, verbose_name='کلید')
    title = models.CharField(max_length=100, verbose_name='عنوان')
    duration_minutes = models.PositiveIntegerField(verbose_name='مدت (دقیقه)')
    color = models.CharField(max_length=20, default='#10b981', verbose_name='رنگ')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.owner_id}:{self.key} ({self.title})'

    class Meta:
        db_table = 'planning_savedblocktemplate'
        ordering = ['title', 'id']
        verbose_name = 'بلوک آماده مشاور'
        verbose_name_plural = 'بلوک‌های آماده مشاور'
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'key'],
                name='unique_saved_block_template_per_owner',
            ),
        ]
        indexes = [
            models.Index(fields=['owner', 'title'], name='planning_tpl_owner_title_idx'),
        ]


class CalendarSnapshotModel(models.Model):
    """نسخه‌ی ذخیره‌شده‌ی تقویم یک دانش‌آموز در لحظه‌ی انتشار برنامه.

    رویدادها به‌صورت JSON نگه‌داری می‌شوند نه ردیف‌های جدول: اسنپ‌شات یک «سند
    تغییرناپذیر» است و هیچ‌وقت کوئری‌های ریزدانه روی محتوایش زده نمی‌شود؛ ذخیره‌ی
    ردیفی فقط جدول را چند برابر بزرگ می‌کرد.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='calendar_snapshots',
        verbose_name='دانش‌آموز',
    )
    reason = models.CharField(max_length=32, verbose_name='علت ثبت نسخه')
    plan_run_id = models.CharField(
        max_length=64, blank=True, default='', verbose_name='شناسه اجرای برنامه',
    )
    payload = models.JSONField(default=list, verbose_name='رویدادهای تقویم')
    event_count = models.PositiveIntegerField(default=0, verbose_name='تعداد رویداد')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} @ {self.created_at:%Y-%m-%d %H:%M}'

    class Meta:
        db_table = 'planning_calendarsnapshot'
        ordering = ['-created_at', '-id']
        verbose_name = 'نسخه تقویم'
        verbose_name_plural = 'نسخه‌های تقویم'
        indexes = [
            models.Index(fields=['user', '-created_at'], name='planning_snap_user_idx'),
        ]


class CalendarEventModel(models.Model):
    """رویدادهای تقویم شمسی کاربر."""

    KIND_CHOICES = [
        (EventKind.MUTABLE.value, 'قابل تغییر'),
        (EventKind.IMMUTABLE.value, 'ثابت (مدرسه)'),
    ]
    ORIGIN_CHOICES = [
        (EventOrigin.STUDENT.value, 'دانش‌آموز'),
        (EventOrigin.CONSULTANT.value, 'مشاور'),
        (EventOrigin.ALGORITHM.value, 'موتور برنامه‌ریزی'),
        (EventOrigin.SCHOOL.value, 'مدرسه'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')
    client_id = models.CharField(max_length=64, verbose_name='شناسه کلاینت')
    jy = models.IntegerField(verbose_name='سال شمسی')
    jm = models.IntegerField(verbose_name='ماه شمسی')
    jd = models.IntegerField(verbose_name='روز شمسی')
    date = models.DateField(
        verbose_name='تاریخ میلادی معادل',
        help_text='آینه‌ی میلادی همان روز شمسی؛ فقط برای کوئری بازه‌ای و مرتب‌سازی',
    )
    title = models.CharField(max_length=300, verbose_name='عنوان')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    start_minutes = models.IntegerField(default=0, verbose_name='دقیقه شروع از نیمه‌شب')
    end_minutes = models.IntegerField(default=MINUTES_IN_DAY, verbose_name='دقیقه پایان از نیمه‌شب')
    color = models.CharField(max_length=20, default='#10b981', verbose_name='رنگ')
    all_day = models.BooleanField(default=False, verbose_name='تمام روز')
    kind = models.CharField(
        max_length=16, choices=KIND_CHOICES, default=EventKind.MUTABLE.value,
        verbose_name='جنس رویداد',
        help_text='رویداد ثابت مدرسه تحت هیچ شرایطی توسط مشاور، دانش‌آموز یا الگوریتم تغییر نمی‌کند',
    )
    origin = models.CharField(
        max_length=16, choices=ORIGIN_CHOICES, default=EventOrigin.STUDENT.value,
        verbose_name='منشأ ایجاد',
    )
    group_id = models.CharField(
        max_length=64, blank=True, default='',
        verbose_name='شناسه گروه',
        help_text='رویدادهای ایجادشده با تکرار، این شناسه مشترک دارند',
    )
    version = models.PositiveIntegerField(
        default=1, verbose_name='نسخه',
        help_text='شماره‌ی نسخه برای کنترل همزمانی خوش‌بینانه',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.jy}/{self.jm}/{self.jd})"

    class Meta:
        db_table = 'planning_calendarevent'
        ordering = ['jy', 'jm', 'jd', 'start_minutes']
        verbose_name = 'رویداد تقویم'
        verbose_name_plural = 'رویدادهای تقویم'
        indexes = [
            models.Index(fields=['user', 'date'], name='planning_evt_user_date_idx'),
            models.Index(fields=['group_id'], name='planning_evt_group_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'client_id'],
                name='unique_calendar_event_per_user',
            ),
            models.CheckConstraint(
                check=models.Q(start_minutes__gte=0)
                & models.Q(end_minutes__lte=MINUTES_IN_DAY)
                & models.Q(start_minutes__lt=models.F('end_minutes')),
                name='planning_event_valid_time_range',
            ),
        ]
