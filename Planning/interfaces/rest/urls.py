"""مسیرهای HTTP اپ Planning.

مسیرهای ``calendar-events/`` دقیقاً همان قرارداد فعلی فرانت‌اند است و جابه‌جا نشده؛
مسیرهای مدیریتی زیر ``planning/`` گروه‌بندی شده‌اند.
"""
from django.urls import path

from .views import (
    BlockTemplateDetailView,
    BlockTemplateListCreateView,
    CalendarEventDetailView,
    CalendarEventGroupView,
    CalendarEventListCreateView,
    CalendarSnapshotListView,
    CalendarSnapshotRestoreView,
    ClassFixedEventGroupDetailView,
    ClassFixedEventListCreateView,
    ConsultantGroupDetailView,
    ConsultantGroupListCreateView,
    ConsultantGroupMembersView,
    ConsultantNoteDetailView,
    ConsultantAnalyticsHubView,
    ConsultantDashboardView,
    ConsultantPreferencesView,
    ConsultantRosterView,
    ConsultantStudentMessagesView,
    ConsultantStudentNotesView,
    DayAvailabilityView,
    MoveBlockView,
    PlaceBlockView,
    ApplyStudentBlocksView,
    PlanPreviewView,
    PlanPublishView,
    PlanRunDetailView,
    PlanRunListView,
    StudentActualCalendarView,
    StudentDailyReportView,
    StudentDirectMessageListCreateView,
    StudentProgressView,
    StudentProposalListView,
    StudentProposalRespondView,
    StudentSchoolConsultantsView,
)

urlpatterns = [
    # تقویم (دانش‌آموز، و با ?user=<id> برای مشاور/مدیر همان مدرسه)
    path('calendar-events/', CalendarEventListCreateView.as_view(), name='calendar_event_list'),
    path(
        'calendar-events/group/<str:group_id>/',
        CalendarEventGroupView.as_view(),
        name='calendar_event_group',
    ),
    path(
        'calendar-events/<str:client_id>/',
        CalendarEventDetailView.as_view(),
        name='calendar_event_detail',
    ),

    # جای‌گذاری بلوک روی تقویم (پنل بلوک‌ها، فضای خالی، درگ‌ودراپ)
    path(
        'planning/block-templates/',
        BlockTemplateListCreateView.as_view(),
        name='planning_block_templates',
    ),
    path(
        'planning/block-templates/<str:key>/',
        BlockTemplateDetailView.as_view(),
        name='planning_block_template_detail',
    ),
    path(
        'planning/calendar/availability/',
        DayAvailabilityView.as_view(),
        name='planning_day_availability',
    ),
    path('planning/calendar/blocks/', PlaceBlockView.as_view(), name='planning_place_block'),
    path(
        'planning/calendar/blocks/<str:client_id>/move/',
        MoveBlockView.as_view(),
        name='planning_move_block',
    ),

    # اسنپ‌شات تقویم (بازگردانی پس از انتشار)
    path(
        'planning/calendar/snapshots/',
        CalendarSnapshotListView.as_view(),
        name='planning_calendar_snapshots',
    ),
    path(
        'planning/calendar/snapshots/<int:snapshot_id>/restore/',
        CalendarSnapshotRestoreView.as_view(),
        name='planning_calendar_snapshot_restore',
    ),

    # پنل مشاور: پیشخوان تریاژ + فهرست دانش‌آموزان و گروه‌بندی
    path(
        'planning/consultant/dashboard/',
        ConsultantDashboardView.as_view(),
        name='planning_consultant_dashboard',
    ),
    path(
        'planning/consultant/analytics/',
        ConsultantAnalyticsHubView.as_view(),
        name='planning_consultant_analytics',
    ),
    path(
        'planning/consultant/preferences/',
        ConsultantPreferencesView.as_view(),
        name='planning_consultant_preferences',
    ),
    path(
        'planning/consultant/students/',
        ConsultantRosterView.as_view(),
        name='planning_consultant_students',
    ),
    path(
        'planning/consultant/groups/',
        ConsultantGroupListCreateView.as_view(),
        name='planning_consultant_groups',
    ),
    path(
        'planning/consultant/groups/<int:group_id>/',
        ConsultantGroupDetailView.as_view(),
        name='planning_consultant_group_detail',
    ),
    path(
        'planning/consultant/groups/<int:group_id>/members/',
        ConsultantGroupMembersView.as_view(),
        name='planning_consultant_group_members',
    ),

    # پروفایل دانش‌آموز: پیام مستقیم و یادداشت خصوصی مشاور
    path(
        'planning/consultant/students/<int:user_id>/notes/',
        ConsultantStudentNotesView.as_view(),
        name='planning_consultant_student_notes',
    ),
    path(
        'planning/consultant/notes/<int:note_id>/',
        ConsultantNoteDetailView.as_view(),
        name='planning_consultant_note_detail',
    ),
    path(
        'planning/consultant/students/<int:user_id>/messages/',
        ConsultantStudentMessagesView.as_view(),
        name='planning_consultant_student_messages',
    ),
    path(
        'planning/me/messages/',
        StudentDirectMessageListCreateView.as_view(),
        name='planning_my_messages',
    ),
    path(
        'planning/me/consultants/',
        StudentSchoolConsultantsView.as_view(),
        name='planning_my_consultants',
    ),

    path(
        'planning/consultant/students/<int:user_id>/apply-blocks/',
        ApplyStudentBlocksView.as_view(),
        name='planning_apply_student_blocks',
    ),

    # برنامه‌ریزی گروهی مشاور
    path(
        'planning/consultant/plans/preview/',
        PlanPreviewView.as_view(),
        name='planning_plan_preview',
    ),
    path(
        'planning/consultant/plans/publish/',
        PlanPublishView.as_view(),
        name='planning_plan_publish',
    ),
    path(
        'planning/consultant/plans/',
        PlanRunListView.as_view(),
        name='planning_plan_runs',
    ),
    path(
        'planning/consultant/plans/<int:run_id>/',
        PlanRunDetailView.as_view(),
        name='planning_plan_run_detail',
    ),

    # گزارش پیشرفت (دانش‌آموز خودش؛ مشاور/مدیر با ?user=)
    path(
        'planning/progress/',
        StudentProgressView.as_view(),
        name='planning_student_progress',
    ),
    path(
        'planning/progress/daily/',
        StudentDailyReportView.as_view(),
        name='planning_student_daily_report',
    ),
    path(
        'planning/progress/actual-calendar/',
        StudentActualCalendarView.as_view(),
        name='planning_student_actual_calendar',
    ),

    # اینباکس پیشنهاد برنامه برای دانش‌آموز
    path(
        'planning/me/proposals/',
        StudentProposalListView.as_view(),
        name='planning_my_proposals',
    ),
    path(
        'planning/me/proposals/<int:proposal_id>/respond/',
        StudentProposalRespondView.as_view(),
        name='planning_my_proposal_respond',
    ),

    # رویدادهای ثابت کلاس (مدیر مدرسه)
    path(
        'planning/manager/classes/<int:class_id>/fixed-events/',
        ClassFixedEventListCreateView.as_view(),
        name='planning_class_fixed_events',
    ),
    path(
        'planning/manager/classes/<int:class_id>/fixed-events/<str:group_id>/',
        ClassFixedEventGroupDetailView.as_view(),
        name='planning_class_fixed_event_group',
    ),
]
