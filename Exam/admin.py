from django.contrib import admin

from .models import ExamAsset, ExamRecord, SessionParticipantRecord, SessionRecord


@admin.register(ExamRecord)
class ExamRecordAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'school', 'problems_count', 'created_at')


@admin.register(SessionRecord)
class SessionRecordAdmin(admin.ModelAdmin):
    list_display = ('title', 'exam', 'status', 'start_time', 'end_time')


admin.site.register(ExamAsset)
admin.site.register(SessionParticipantRecord)
