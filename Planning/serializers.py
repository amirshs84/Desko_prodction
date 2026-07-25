from rest_framework import serializers

from .models import CalendarEvent


class CalendarEventSerializer(serializers.ModelSerializer):
    """سریالایزر رویداد تقویم — client_id همان id کلاینت است"""
    class Meta:
        model = CalendarEvent
        fields = [
            'client_id', 'group_id', 'jy', 'jm', 'jd',
            'title', 'description',
            'start_minutes', 'end_minutes',
            'color', 'all_day', 'created_at',
        ]
        read_only_fields = ['created_at']


class CalendarEventGroupPatchSerializer(serializers.Serializer):
    """فیلدهای مشترک قابل ویرایش برای کل گروه"""
    title = serializers.CharField(max_length=300, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_minutes = serializers.IntegerField(required=False)
    end_minutes = serializers.IntegerField(required=False)
    color = serializers.CharField(max_length=20, required=False)
    all_day = serializers.BooleanField(required=False)
