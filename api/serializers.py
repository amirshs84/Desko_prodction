from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Subject, StudySession, ConsultantTicket, School, PDFReadProgress, Notification, SchoolClass, ClassEnrollment


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone_number', 'full_name', 'grade', 'olympiad_field', 'role', 'is_superadmin', 'is_profile_complete']
        read_only_fields = ['phone_number', 'role', 'is_superadmin']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'color_code']


class StudySessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_color = serializers.CharField(source='subject.color_code', read_only=True)
    subject = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StudySession
        fields = [
            'id',
            'subject',
            'subject_name',
            'subject_color',
            'description',
            'start_time',
            'end_time',
            'duration_seconds',
            'is_valid'
        ]
        read_only_fields = ['id', 'duration_seconds']

    def create(self, validated_data):
        # Calculate duration automatically
        start = validated_data.get('start_time')
        end = validated_data.get('end_time')
        if start and end:
            duration = (end - start).total_seconds()
            validated_data['duration_seconds'] = int(duration)
        return super().create(validated_data)


class ConsultantTicketSerializer(serializers.ModelSerializer):
    """سریالایزر برای ارسال تیکت توسط دانش‌آموز"""
    class Meta:
        model = ConsultantTicket
        fields = [
            'id',
            'ticket_type',
            'message',
            'created_at',
            'is_resolved',
            'reply',
            'replied_at',
        ]
        read_only_fields = ['created_at', 'is_resolved', 'reply', 'replied_at']


class StudentTicketDetailSerializer(serializers.ModelSerializer):
    """سریالایزر برای نمایش تیکت‌های دانش‌آموز با اطلاعات کامل"""
    replied_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ConsultantTicket
        fields = [
            'id',
            'ticket_type',
            'message',
            'created_at',
            'is_resolved',
            'reply',
            'replied_by_name',
            'replied_at',
        ]

    def get_replied_by_name(self, obj):
        if obj.replied_by and hasattr(obj.replied_by, 'profile'):
            return obj.replied_by.profile.full_name or obj.replied_by.profile.phone_number
        return None


class ManagerTicketSerializer(serializers.ModelSerializer):
    """سریالایزر برای نمایش تیکت‌ها در پنل مدیر"""
    student_name = serializers.SerializerMethodField()
    student_phone = serializers.SerializerMethodField()
    student_grade = serializers.SerializerMethodField()

    class Meta:
        model = ConsultantTicket
        fields = [
            'id',
            'ticket_type',
            'message',
            'created_at',
            'is_resolved',
            'reply',
            'replied_at',
            'student_name',
            'student_phone',
            'student_grade',
        ]

    def get_student_name(self, obj):
        if hasattr(obj.user, 'profile'):
            return obj.user.profile.full_name or obj.user.profile.phone_number
        return obj.user.username

    def get_student_phone(self, obj):
        if hasattr(obj.user, 'profile'):
            return obj.user.profile.phone_number
        return obj.user.username

    def get_student_grade(self, obj):
        if hasattr(obj.user, 'profile'):
            return obj.user.profile.grade
        return ''


class TicketReplySerializer(serializers.Serializer):
    """سریالایزر برای ثبت پاسخ به تیکت"""
    reply = serializers.CharField(min_length=1)


class PhoneLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)


# Manager Panel Serializers
class ManagerStudentListSerializer(serializers.Serializer):
    """Serializer for student list in manager panel"""
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone_number = serializers.CharField()
    grade = serializers.CharField()
    olympiad_field = serializers.CharField()
    today_total = serializers.IntegerField()
    week_total = serializers.IntegerField()
    trend = serializers.CharField()
    trend_percent = serializers.FloatField()
    last_activity = serializers.DateTimeField(allow_null=True)


class ManagerDashboardKPISerializer(serializers.Serializer):
    """Serializer for KPI cards in manager dashboard (legacy + demo overview)."""
    avg_study_today = serializers.CharField()
    avg_study_today_seconds = serializers.IntegerField()
    change_percent = serializers.FloatField()
    top_student = serializers.DictField()
    absent_count = serializers.IntegerField()
    active_now = serializers.IntegerField()
    total_students = serializers.IntegerField()

    # Demo dashboard overview
    total_teachers = serializers.IntegerField()
    total_exams = serializers.IntegerField()
    total_classes = serializers.IntegerField()
    active_classes = serializers.IntegerField()
    at_risk_count = serializers.IntegerField()
    students_change_percent = serializers.FloatField()
    teachers_change_percent = serializers.FloatField()
    exams_change_percent = serializers.FloatField()
    classes_change_percent = serializers.FloatField()
    at_risk_change = serializers.IntegerField()
    avg_grade = serializers.FloatField(allow_null=True)
    avg_grade_change_percent = serializers.FloatField()
    attendance_rate = serializers.FloatField()
    attendance_change_percent = serializers.FloatField()
    school_performance = serializers.FloatField()
    school_performance_change_percent = serializers.FloatField()
    parent_participation = serializers.FloatField()
    curriculum_progress = serializers.FloatField()
    student_teacher_ratio = serializers.CharField()
    student_participation_rate = serializers.FloatField()
    attendance_trend_30d = serializers.ListField(child=serializers.DictField())
    performance_distribution = serializers.ListField(child=serializers.DictField())
    top_students_week = serializers.ListField(child=serializers.DictField())


class ManagerAttendanceSerializer(serializers.Serializer):
    """حضور و غیاب مدیر — بر اساس وجود StudySession در روز."""
    date = serializers.CharField()
    total_students = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    delay_count = serializers.IntegerField()
    leave_count = serializers.IntegerField()
    teachers_absent = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    attendance_change_percent = serializers.FloatField()
    absent_change = serializers.IntegerField()
    delay_change = serializers.IntegerField()
    teachers_absent_change = serializers.IntegerField()
    at_risk_count = serializers.IntegerField()
    at_risk_min_days = serializers.IntegerField()
    status_distribution = serializers.ListField(child=serializers.DictField())
    attendance_trend = serializers.ListField(child=serializers.DictField())
    at_risk_students = serializers.ListField(child=serializers.DictField())
    classes_most_absence = serializers.ListField(child=serializers.DictField())
    table = serializers.DictField()
    class_options = serializers.ListField(child=serializers.DictField())


# SuperAdmin Serializers
class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model"""
    member_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    
    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'address',
            'invitation_code',
            'normal_study_threshold',
            'is_active',
            'member_count',
            'manager_name',
            'created_at'
        ]
        read_only_fields = ['invitation_code', 'created_at']
    
    def get_member_count(self, obj):
        return obj.members.filter(role='student').count()
    
    def get_manager_name(self, obj):
        manager = obj.members.filter(role='manager').first()
        return manager.full_name if manager else 'تعیین نشده'


class AssignManagerSerializer(serializers.Serializer):
    """Serializer for assigning a manager to a school"""
    phone_number = serializers.CharField(max_length=11)
    
    def validate_phone_number(self, value):
        if not value.startswith('09') or len(value) != 11:
            raise serializers.ValidationError('شماره تلفن معتبر نیست')
        return value


class AssignConsultantSerializer(serializers.Serializer):
    """Serializer for assigning/revoking a consultant of a school

    Unlike managers, a school may have several consultants, so assigning one
    never demotes the others.
    """
    phone_number = serializers.CharField(max_length=11)

    def validate_phone_number(self, value):
        if not value.startswith('09') or len(value) != 11:
            raise serializers.ValidationError('شماره تلفن معتبر نیست')
        return value


class SuperAdminManualStudentSerializer(serializers.Serializer):
    """ثبت دستی دانش‌آموز توسط سوپرادمین — بدون محدودیت پیچیدگی رمز"""
    phone_number = serializers.CharField(max_length=11)
    password = serializers.CharField(write_only=True, min_length=1)
    full_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    grade = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    olympiad_field = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    def validate_grade(self, value):
        if not value:
            return ''
        valid = {c[0] for c in UserProfile.GRADE_CHOICES}
        if value not in valid:
            raise serializers.ValidationError('پایه تحصیلی نامعتبر است')
        return value

    def validate_olympiad_field(self, value):
        if not value:
            return ''
        valid = {c[0] for c in UserProfile.OLYMPIAD_CHOICES}
        if value not in valid:
            raise serializers.ValidationError('رشته المپیاد نامعتبر است')
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """نوتیفیکیشن برای نمایش به کاربر، به‌همراه وضعیت خواندن"""
    is_read         = serializers.SerializerMethodField()
    target_schools_detail = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = ['id', 'title', 'body', 'created_at', 'is_read',
                  'target_type', 'target_schools_detail']

    def get_is_read(self, obj):
        read_ids = self.context.get('read_ids', set())
        return obj.id in read_ids

    def get_target_schools_detail(self, obj):
        return [{'id': s.id, 'name': s.name} for s in obj.target_schools.all()]


class SendNotificationSerializer(serializers.Serializer):
    """ارسال نوتیفیکیشن توسط سوپرادمین"""
    title       = serializers.CharField(max_length=200)
    body        = serializers.CharField()
    target_type = serializers.ChoiceField(choices=Notification.TARGET_TYPE_CHOICES)
    school_ids  = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )

    def validate(self, data):
        school_targets = (Notification.TARGET_SCHOOL_ALL, Notification.TARGET_SCHOOL_STUDENTS)
        if data['target_type'] in school_targets and not data.get('school_ids'):
            raise serializers.ValidationError(
                {'school_ids': 'برای این نوع مخاطب باید حداقل یک مدرسه انتخاب کنید.'}
            )
        return data


class PDFReadProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFReadProgress
        fields = ['filename', 'last_read_page', 'updated_at']
        read_only_fields = ['updated_at']

    def validate_last_read_page(self, value):
        if value < 1:
            raise serializers.ValidationError('شماره صفحه باید بزرگ‌تر از صفر باشد')
        return value


# Manager Class Serializers

class SchoolClassSerializer(serializers.ModelSerializer):
    """سریالایزر کلاس برای مدیر مدرسه"""
    grade_display = serializers.CharField(source='get_grade_display', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = [
            'id',
            'code',
            'name',
            'grade',
            'grade_display',
            'is_active',
            'student_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.enrollments.count()

    def validate_code(self, value):
        return value.strip()

    def validate_name(self, value):
        return value.strip()

    def validate_grade(self, value):
        valid = {c[0] for c in UserProfile.GRADE_CHOICES}
        if value not in valid:
            raise serializers.ValidationError('مقطع نامعتبر است')
        return value

    def validate(self, attrs):
        school = self.context.get('school')
        code = attrs.get('code') or (self.instance.code if self.instance else None)
        if school and code:
            qs = SchoolClass.objects.filter(school=school, code__iexact=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'code': 'این کد کلاس در مدرسه قبلاً ثبت شده است'})
        return attrs


class ClassStudentSerializer(serializers.Serializer):
    """اطلاعات دانش‌آموز عضو کلاس"""
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone_number = serializers.CharField()
    grade = serializers.CharField()
    grade_display = serializers.CharField()
    enrolled_at = serializers.DateTimeField()


class ClassEnrollmentRequestSerializer(serializers.Serializer):
    """افزودن دانش‌آموزان به کلاس"""
    student_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1,
        allow_empty=False,
    )


class ManagerSchoolSettingsSerializer(serializers.ModelSerializer):
    """تنظیمات عمومی مدرسه — قابل ویرایش توسط مدیر"""
    class Meta:
        model = School
        fields = ['id', 'name', 'phone', 'email', 'address', 'invitation_code']
        read_only_fields = ['id', 'invitation_code']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('نام مدرسه الزامی است')
        return value


class ManagerChangePasswordSerializer(serializers.Serializer):
    """تغییر رمز عبور مدیر"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'رمزهای عبور جدید مطابقت ندارند'})
        return data

