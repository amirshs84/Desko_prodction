from __future__ import annotations

import uuid

from django.db import models
from django.conf import settings

from api.models import School, UserProfile


def booklet_upload_to(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'pdf'
    return f'exam_booklets/{instance.id}.{ext}'


class ExamAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exam_assets',
    )
    file = models.FileField(upload_to=booklet_upload_to)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, default='application/pdf')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'فایل دفترچه آزمون'
        verbose_name_plural = 'فایل‌های دفترچه آزمون'


class ExamRecord(models.Model):
    athena_exam_id = models.UUIDField(unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_exams',
    )
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='exams')
    asset = models.ForeignKey(ExamAsset, on_delete=models.PROTECT, related_name='exams')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    problems_count = models.PositiveIntegerField()
    options_per_problem = models.PositiveIntegerField(default=4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'آزمون'
        verbose_name_plural = 'آزمون‌ها'


class SessionRecord(models.Model):
    STATUS_SCHEDULED = 'SCHEDULED'
    STATUS_RUNNING = 'RUNNING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'زمان‌بندی‌شده'),
        (STATUS_RUNNING, 'در حال برگزاری'),
        (STATUS_COMPLETED, 'پایان‌یافته'),
        (STATUS_CANCELLED, 'لغو شده'),
    ]

    athena_session_id = models.UUIDField(unique=True)
    exam = models.ForeignKey(ExamRecord, on_delete=models.CASCADE, related_name='sessions')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_exam_sessions',
    )
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='exam_sessions')
    title = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        verbose_name = 'جلسه آزمون'
        verbose_name_plural = 'جلسات آزمون'


class SessionParticipantRecord(models.Model):
    STATUS_ASSIGNED = 'ASSIGNED'
    STATUS_REMOVED = 'REMOVED'
    STATUS_CHOICES = [
        (STATUS_ASSIGNED, 'ثبت‌شده'),
        (STATUS_REMOVED, 'حذف‌شده'),
    ]

    session = models.ForeignKey(
        SessionRecord,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exam_participations',
    )
    athena_user_id = models.UUIDField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ASSIGNED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session', 'user')
        verbose_name = 'شرکت‌کننده آزمون'
        verbose_name_plural = 'شرکت‌کنندگان آزمون'
