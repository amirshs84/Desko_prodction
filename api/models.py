from django.db import models
from django.contrib.auth.models import User
import secrets


class School(models.Model):
    """مدل مدرسه برای سیستم چندمدرسه‌ای"""
    name = models.CharField(max_length=200, verbose_name='نام مدرسه')
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name='تلفن')
    email = models.EmailField(blank=True, default='', verbose_name='ایمیل')
    address = models.TextField(blank=True, default='', verbose_name='آدرس')
    invitation_code = models.CharField(
        max_length=8, 
        unique=True, 
        verbose_name='کد دعوت',
        help_text='کد منحصربه‌فرد برای عضویت دانش‌آموزان'
    )
    normal_study_threshold = models.IntegerField(
        default=21600,  # 6 hours in seconds
        verbose_name='حد نرمال مطالعه (ثانیه)',
        help_text='زمان مطالعه نرمال روزانه به ثانیه'
    )
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.invitation_code:
            # Generate unique 8-character invitation code
            self.invitation_code = self.generate_invitation_code()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_invitation_code():
        """تولید کد دعوت منحصربه‌فرد 8 کاراکتری"""
        while True:
            code = secrets.token_urlsafe(6)[:8].upper()
            if not School.objects.filter(invitation_code=code).exists():
                return code
    
    def __str__(self):
        return f"{self.name} ({self.invitation_code})"
    
    class Meta:
        verbose_name = 'مدرسه'
        verbose_name_plural = 'مدرسه‌ها'
        ordering = ['-created_at']


class UserProfile(models.Model):
    """پروفایل کاربر با اطلاعات تکمیلی"""
    GRADE_CHOICES = [
        ('7', 'هفتم'),
        ('8', 'هشتم'),
        ('9', 'نهم'),
        ('10', 'دهم'),
        ('11', 'یازدهم'),
        ('12', 'دوازدهم'),
        ('graduate', 'فارغ‌التحصیل'),
    ]
    
    OLYMPIAD_CHOICES = [
        ('math', 'ریاضی'),
        ('physics', 'فیزیک'),
        ('chemistry', 'شیمی'),
        ('biology', 'زیست‌شناسی'),
        ('computer', 'کامپیوتر'),
        ('astronomy', 'نجوم'),
        ('none', 'ندارم'),
    ]
    
    ROLE_CHOICES = [
        ('student', 'دانش‌آموز'),
        ('manager', 'مدیر'),
        ('consultant', 'مشاور'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    school = models.ForeignKey(
        School, 
        on_delete=models.CASCADE, 
        related_name='members',
        null=True,
        blank=True,
        verbose_name='مدرسه'
    )
    phone_number = models.CharField(max_length=11, unique=True)
    full_name = models.CharField(max_length=200, blank=True)
    grade = models.CharField(max_length=20, choices=GRADE_CHOICES, blank=True)
    olympiad_field = models.CharField(max_length=20, choices=OLYMPIAD_CHOICES, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    is_superadmin = models.BooleanField(default=False, verbose_name='سوپرادمین')
    is_profile_complete = models.BooleanField(default=False)
    is_password_set = models.BooleanField(default=False, verbose_name='رمز عبور تنظیم شده')
    is_studying = models.BooleanField(default=False, verbose_name='در حال مطالعه')
    athena_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        verbose_name='شناسه موتور آزمون',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.full_name or self.phone_number}"
    
    class Meta:
        verbose_name = 'پروفایل کاربر'
        verbose_name_plural = 'پروفایل‌های کاربر'


class Subject(models.Model):
    name = models.CharField(max_length=100)
    color_code = models.CharField(max_length=7)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjects', null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'],
                name='unique_subject_per_user'
            )
        ]


class StudySession(models.Model):
    MODE_STUDY = 'study'
    MODE_TEST = 'test'
    MODE_SOLVE = 'solve'
    MODE_REVIEW = 'review'
    MODE_HOMEWORK = 'homework'
    MODE_CHOICES = [
        (MODE_STUDY, 'مطالعه'),
        (MODE_TEST, 'تست‌زنی'),
        (MODE_SOLVE, 'حل سوال'),
        (MODE_REVIEW, 'مرور'),
        (MODE_HOMEWORK, 'تکلیف'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='sessions')
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    is_valid = models.BooleanField(default=True)
    mode = models.CharField(
        max_length=16,
        choices=MODE_CHOICES,
        default=MODE_STUDY,
        verbose_name='نوع فعالیت',
    )
    count_test = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='تعداد تست',
    )

    def __str__(self):
        return f"{self.user.username} - {self.subject.name} - {self.start_time}"

    class Meta:
        ordering = ['-start_time']


class ConsultantTicket(models.Model):
    TICKET_TYPE_CHOICES = [
        ('consultant', 'مشاوره درسی'),
        ('support', 'پشتیبانی سایت'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.CharField(
        max_length=20,
        choices=TICKET_TYPE_CHOICES,
        default='consultant',
        verbose_name='نوع تیکت'
    )
    message = models.TextField(verbose_name='متن پیام')
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    # پاسخ
    reply = models.TextField(blank=True, null=True, verbose_name='پاسخ')
    replied_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replied_tickets',
        verbose_name='پاسخ‌دهنده'
    )
    replied_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان پاسخ')

    def __str__(self):
        return f"Ticket #{self.id} - {self.user.username} ({self.ticket_type})"

    class Meta:
        verbose_name = 'تیکت'
        verbose_name_plural = 'تیکت‌ها'
        ordering = ['-created_at']


class Notification(models.Model):
    """نوتیفیکیشن‌های broadcast از سوپرادمین به کاربران"""
    TARGET_ALL             = 'all'
    TARGET_ALL_STUDENTS    = 'all_students'
    TARGET_SCHOOL_ALL      = 'school_all'
    TARGET_SCHOOL_STUDENTS = 'school_students'

    TARGET_TYPE_CHOICES = [
        (TARGET_ALL,             'همه کاربران'),
        (TARGET_ALL_STUDENTS,    'همه دانش‌آموزان'),
        (TARGET_SCHOOL_ALL,      'مدارس خاص – همه'),
        (TARGET_SCHOOL_STUDENTS, 'مدارس خاص – فقط دانش‌آموزان'),
    ]

    title          = models.CharField(max_length=200, verbose_name='عنوان')
    body           = models.TextField(verbose_name='متن')
    sender         = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='sent_notifications', verbose_name='فرستنده'
    )
    target_type    = models.CharField(
        max_length=20, choices=TARGET_TYPE_CHOICES,
        default=TARGET_ALL, verbose_name='مخاطب'
    )
    target_schools = models.ManyToManyField(
        School, blank=True,
        related_name='notifications', verbose_name='مدارس هدف'
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    is_active      = models.BooleanField(default=True, verbose_name='فعال')

    class Meta:
        ordering        = ['-created_at']
        verbose_name    = 'نوتیفیکیشن'
        verbose_name_plural = 'نوتیفیکیشن‌ها'

    def __str__(self):
        return f"{self.title} ({self.get_target_type_display()})"


class NotificationRead(models.Model):
    """ردیابی اینکه هر کاربر کدام نوتیفیکیشن را دیده است"""
    user         = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notification_reads'
    )
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name='reads'
    )
    read_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'خواندن نوتیفیکیشن'
        verbose_name_plural = 'خواندن‌های نوتیفیکیشن'
        constraints         = [
            models.UniqueConstraint(
                fields=['user', 'notification'],
                name='unique_notification_read'
            )
        ]

    def __str__(self):
        return f"{self.user} – {self.notification.title}"


class PDFReadProgress(models.Model):
    """متادیتای پیشروی مطالعه PDF (بدون ذخیره فایل)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pdf_read_progress')
    filename = models.CharField(max_length=255, verbose_name='شناسه فایل در کلاینت')
    last_read_page = models.PositiveIntegerField(default=1, verbose_name='آخرین صفحه مطالعه شده')
    total_pages = models.PositiveIntegerField(default=0, verbose_name='تعداد کل صفحات')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.filename} (p{self.last_read_page})"

    class Meta:
        verbose_name = 'پیشروی مطالعه PDF'
        verbose_name_plural = 'پیشروی‌های مطالعه PDF'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'filename'],
                name='unique_pdf_progress_per_user_file'
            )
        ]


class SchoolClass(models.Model):
    """کلاس درسی متعلق به یک مدرسه"""
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='classes',
        verbose_name='مدرسه',
    )
    code = models.CharField(max_length=50, verbose_name='کد کلاس')
    name = models.CharField(max_length=200, verbose_name='نام کلاس')
    grade = models.CharField(
        max_length=20,
        choices=UserProfile.GRADE_CHOICES,
        verbose_name='مقطع',
    )
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = 'کلاس'
        verbose_name_plural = 'کلاس‌ها'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['school', 'code'],
                name='unique_class_code_per_school',
            )
        ]


class ClassEnrollment(models.Model):
    """عضویت دانش‌آموز در کلاس"""
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name='کلاس',
    )
    student = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='class_enrollments',
        verbose_name='دانش‌آموز',
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} → {self.school_class}"

    class Meta:
        verbose_name = 'عضویت کلاس'
        verbose_name_plural = 'عضویت‌های کلاس'
        constraints = [
            models.UniqueConstraint(
                fields=['school_class', 'student'],
                name='unique_student_per_class',
            )
        ]
