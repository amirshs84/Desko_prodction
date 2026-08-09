"""مدل‌های Django کانتکست مداخله — «شکل دیتابیس»، نه دامنه.

عضویت در جدول جداگانه است (نه فیلد آرایه‌ای) تا کوئری «این دانش‌آموز در کدام
گروه‌هاست» و «اعضای این گروه» هر دو ایندکس‌پذیر باشند و یکتایی عضویت را دیتابیس
تضمین کند.

ارجاع به ``api.School`` با رشته نوشته شده تا این ماژول به مدل‌های اپ ``api``
import سخت نداشته باشد؛ یکپارچگی ارجاعی و cascade را از دیتابیس می‌گیریم.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.db import models


class StudentGroupModel(models.Model):
    """گروه دانش‌آموزیِ ساخته‌ی یک مشاور."""

    school = models.ForeignKey(
        'api.School', on_delete=models.CASCADE, related_name='planning_groups',
        verbose_name='مدرسه',
    )
    consultant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_groups',
        verbose_name='مشاور',
    )
    name = models.CharField(max_length=100, verbose_name='نام گروه')
    description = models.TextField(blank=True, default='', verbose_name='توضیحات')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} ({self.consultant.username})'

    class Meta:
        db_table = 'planning_studentgroup'
        ordering = ['name']
        verbose_name = 'گروه دانش‌آموزی'
        verbose_name_plural = 'گروه‌های دانش‌آموزی'
        constraints = [
            models.UniqueConstraint(
                fields=['consultant', 'name'],
                name='unique_group_name_per_consultant',
            ),
        ]
        indexes = [
            models.Index(fields=['school', 'consultant'], name='planning_grp_school_idx'),
        ]


class PlanRunModel(models.Model):
    """یک بار انتشار برنامه‌ی گروهی توسط مشاور."""

    MODE_CHOICES = [('suggested', 'پیشنهادی'), ('forced', 'قطعی')]

    consultant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_runs', verbose_name='مشاور',
    )
    school = models.ForeignKey(
        'api.School', on_delete=models.CASCADE, related_name='planning_runs',
        verbose_name='مدرسه',
    )
    group = models.ForeignKey(
        StudentGroupModel, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='plan_runs', verbose_name='گروه',
        help_text='اگر برنامه روی فهرست دستی دانش‌آموزان اجرا شده باشد، خالی است',
    )
    mode = models.CharField(max_length=16, choices=MODE_CHOICES, verbose_name='نحوه انتشار')
    intensity = models.CharField(max_length=16, verbose_name='سطح فشردگی')
    group_tag = models.CharField(
        max_length=64, unique=True, verbose_name='برچسب رویدادها',
        help_text='روی همه‌ی رویدادهای ساخته‌شده از این اجرا می‌نشیند (حذف/بازگردانی دسته‌ای)',
    )
    start_date = models.DateField(verbose_name='شروع بازه')
    end_date = models.DateField(verbose_name='پایان بازه')
    start_jy = models.IntegerField()
    start_jm = models.IntegerField()
    start_jd = models.IntegerField()
    end_jy = models.IntegerField()
    end_jm = models.IntegerField()
    end_jd = models.IntegerField()
    summary = models.JSONField(default=dict, verbose_name='خلاصه اجرا')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.consultant.username} · {self.mode} · {self.created_at:%Y-%m-%d}'

    class Meta:
        db_table = 'planning_planrun'
        ordering = ['-created_at', '-id']
        verbose_name = 'اجرای برنامه‌ریزی'
        verbose_name_plural = 'اجراهای برنامه‌ریزی'
        indexes = [
            models.Index(fields=['consultant', '-created_at'], name='planning_run_cons_idx'),
        ]


class PlanProposalModel(models.Model):
    """سهم یک دانش‌آموز از یک اجرای برنامه‌ریزی."""

    STATUS_CHOICES = [
        ('pending', 'در انتظار پاسخ'),
        ('accepted', 'پذیرفته‌شده'),
        ('rejected', 'ردشده'),
    ]

    plan_run = models.ForeignKey(
        PlanRunModel, on_delete=models.CASCADE, related_name='proposals',
        verbose_name='اجرای برنامه',
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_proposals',
        verbose_name='دانش‌آموز',
    )
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default='pending', verbose_name='وضعیت',
    )
    group_tag = models.CharField(max_length=64, verbose_name='برچسب رویدادها')
    blocks = models.JSONField(default=list, verbose_name='بلوک‌های پیشنهادی')
    shortfall_minutes = models.PositiveIntegerField(default=0, verbose_name='کسری زمان')
    applied_blocks = models.PositiveIntegerField(default=0, verbose_name='بلوک‌های اعمال‌شده')
    responded_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان پاسخ')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.student.username} · {self.status}'

    class Meta:
        db_table = 'planning_planproposal'
        ordering = ['-created_at', '-id']
        verbose_name = 'پیشنهاد برنامه'
        verbose_name_plural = 'پیشنهادهای برنامه'
        constraints = [
            models.UniqueConstraint(
                fields=['plan_run', 'student'], name='unique_proposal_per_run_student',
            ),
        ]
        indexes = [
            models.Index(fields=['student', 'status'], name='planning_prop_student_idx'),
        ]


class StudentGroupMemberModel(models.Model):
    """عضویت یک دانش‌آموز در یک گروه (هر دانش‌آموز می‌تواند در چند گروه باشد)."""

    group = models.ForeignKey(
        StudentGroupModel, on_delete=models.CASCADE, related_name='memberships',
        verbose_name='گروه',
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_group_memberships',
        verbose_name='دانش‌آموز',
    )
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.student.username} → {self.group.name}'

    class Meta:
        db_table = 'planning_studentgroupmember'
        verbose_name = 'عضویت گروه'
        verbose_name_plural = 'عضویت‌های گروه'
        constraints = [
            models.UniqueConstraint(
                fields=['group', 'student'],
                name='unique_student_per_planning_group',
            ),
        ]
        indexes = [
            models.Index(fields=['student'], name='planning_grpmem_student_idx'),
        ]


class ConsultantStudentNoteModel(models.Model):
    """یادداشت خصوصی مشاور درباره یک دانش‌آموز — برای دانش‌آموز قابل‌مشاهده نیست."""

    school = models.ForeignKey(
        'api.School', on_delete=models.CASCADE, related_name='planning_student_notes',
        verbose_name='مدرسه',
    )
    consultant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_student_notes',
        verbose_name='مشاور',
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_notes_about',
        verbose_name='دانش‌آموز',
    )
    body = models.TextField(verbose_name='متن یادداشت')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'note#{self.id} · {self.consultant_id} → {self.student_id}'

    class Meta:
        db_table = 'planning_consultantstudentnote'
        ordering = ['-updated_at', '-id']
        verbose_name = 'یادداشت خصوصی مشاور'
        verbose_name_plural = 'یادداشت‌های خصوصی مشاور'
        indexes = [
            models.Index(
                fields=['consultant', 'student', '-updated_at'],
                name='planning_note_cons_stu_idx',
            ),
        ]


class ConsultantDirectMessageModel(models.Model):
    """پیام مستقیم مشاور ↔ دانش‌آموز در یک مدرسه."""

    SENDER_CONSULTANT = 'consultant'
    SENDER_STUDENT = 'student'
    SENDER_CHOICES = [
        (SENDER_CONSULTANT, 'مشاور'),
        (SENDER_STUDENT, 'دانش‌آموز'),
    ]

    school = models.ForeignKey(
        'api.School', on_delete=models.CASCADE, related_name='planning_direct_messages',
        verbose_name='مدرسه',
    )
    consultant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_direct_messages',
        verbose_name='مشاور',
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='planning_student_messages',
        verbose_name='دانش‌آموز',
    )
    sender_role = models.CharField(
        max_length=16, choices=SENDER_CHOICES, verbose_name='فرستنده',
    )
    body = models.TextField(verbose_name='متن پیام')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'msg#{self.id} · {self.sender_role}'

    class Meta:
        db_table = 'planning_consultantdirectmessage'
        ordering = ['created_at', 'id']
        verbose_name = 'پیام مستقیم مشاور'
        verbose_name_plural = 'پیام‌های مستقیم مشاور'
        indexes = [
            models.Index(
                fields=['consultant', 'student', 'created_at'],
                name='planning_dm_thread_idx',
            ),
            models.Index(
                fields=['student', '-created_at'],
                name='planning_dm_student_idx',
            ),
        ]
