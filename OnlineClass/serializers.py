from rest_framework import serializers

from api.models import SchoolClass

from .models import OnlineClass


class OnlineClassSerializer(serializers.ModelSerializer):
    school_class_id = serializers.IntegerField(source='school_class.id', read_only=True)
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)
    school_class_code = serializers.CharField(source='school_class.code', read_only=True)
    grade = serializers.CharField(source='school_class.grade', read_only=True)
    grade_display = serializers.CharField(source='school_class.get_grade_display', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = OnlineClass
        fields = [
            'id',
            'school_class_id',
            'school_class_name',
            'school_class_code',
            'grade',
            'grade_display',
            'title',
            'skyroom_room_id',
            'skyroom_room_name',
            'max_users',
            'is_active',
            'student_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'skyroom_room_id',
            'skyroom_room_name',
            'created_at',
            'updated_at',
        ]

    def get_student_count(self, obj):
        return obj.school_class.enrollments.count()


class StudentOnlineClassSerializer(serializers.Serializer):
    """کلاس‌های ثبت‌نام‌شده دانش‌آموز (با یا بدون اتاق آنلاین)."""

    id = serializers.IntegerField(allow_null=True, required=False)
    online_class_id = serializers.IntegerField(allow_null=True, required=False)
    school_class_id = serializers.IntegerField()
    school_class_name = serializers.CharField()
    school_class_code = serializers.CharField(allow_blank=True)
    grade_display = serializers.CharField(allow_blank=True)
    title = serializers.CharField()
    is_active = serializers.BooleanField()
    has_online_room = serializers.BooleanField()
    is_online_active = serializers.BooleanField()
    can_join = serializers.BooleanField()


class AssignOnlineClassSerializer(serializers.Serializer):
    school_class_id = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    max_users = serializers.IntegerField(min_value=1, required=False, allow_null=True)

    def validate_school_class_id(self, value):
        school = self.context.get('school')
        if not school:
            raise serializers.ValidationError('مدرسه مشخص نیست')
        school_class = SchoolClass.objects.filter(id=value, school=school).first()
        if not school_class:
            raise serializers.ValidationError('کلاس درسی یافت نشد')
        if not school_class.is_active:
            raise serializers.ValidationError('کلاس درسی غیرفعال است')
        if OnlineClass.objects.filter(school_class=school_class).exists():
            raise serializers.ValidationError('این کلاس درسی قبلاً کلاس آنلاین دارد')
        self.context['school_class'] = school_class
        return value


class UpdateOnlineClassSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=False)
    is_active = serializers.BooleanField(required=False)
    max_users = serializers.IntegerField(min_value=1, required=False, allow_null=True)


class JoinOnlineClassSerializer(serializers.Serializer):
    login_url = serializers.URLField(read_only=True)
