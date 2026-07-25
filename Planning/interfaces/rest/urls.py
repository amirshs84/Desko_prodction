"""مسیرهای HTTP اپ Planning.

مسیرهای ``calendar-events/`` دقیقاً همان قرارداد فعلی فرانت‌اند است و جابه‌جا نشده؛
مسیرهای مدیریتی زیر ``planning/`` گروه‌بندی شده‌اند.
"""
from django.urls import path

from .views import (
    BlockTemplateListView,
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
    ConsultantRosterView,
    DayAvailabilityView,
    MoveBlockView,
    PlaceBlockView,
    PlanPreviewView,
    PlanPublishView,
    PlanRunDetailView,
    PlanRunListView,
    StudentProgressView,
    StudentProposalListView,
    StudentProposalRespondView,
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
        BlockTemplateListView.as_view(),
        name='planning_block_templates',
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

    # پنل مشاور: فهرست دانش‌آموزان و گروه‌بندی
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
