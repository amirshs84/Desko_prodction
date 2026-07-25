from django.contrib.auth.models import User
from django.db import models


class CalendarEvent(models.Model):
    """رویدادهای تقویم شمسی کاربر"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')
    client_id = models.CharField(max_length=64, verbose_name='شناسه کلاینت')
    jy = models.IntegerField(verbose_name='سال شمسی')
    jm = models.IntegerField(verbose_name='ماه شمسی')
    jd = models.IntegerField(verbose_name='روز شمسی')
    title = models.CharField(max_length=300, verbose_name='عنوان')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    start_minutes = models.IntegerField(default=0, verbose_name='دقیقه شروع از نیمه‌شب')
    end_minutes = models.IntegerField(default=1440, verbose_name='دقیقه پایان از نیمه‌شب')
    color = models.CharField(max_length=20, default='#10b981', verbose_name='رنگ')
    all_day = models.BooleanField(default=False, verbose_name='تمام روز')
    group_id = models.CharField(
        max_length=64, blank=True, default='',
        verbose_name='شناسه گروه',
        help_text='رویدادهای ایجادشده با تکرار، این شناسه مشترک دارند',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.jy}/{self.jm}/{self.jd})"

    class Meta:
        db_table = 'planning_calendarevent'
        ordering = ['jy', 'jm', 'jd', 'start_minutes']
        verbose_name = 'رویداد تقویم'
        verbose_name_plural = 'رویدادهای تقویم'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'client_id'],
                name='unique_calendar_event_per_user'
            )
        ]
