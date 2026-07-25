from django.urls import path

from .views import (
    CalendarEventDetailView,
    CalendarEventGroupView,
    CalendarEventListCreateView,
)

urlpatterns = [
    # Calendar Events
    path('calendar-events/', CalendarEventListCreateView.as_view(), name='calendar_event_list'),
    path('calendar-events/group/<str:group_id>/', CalendarEventGroupView.as_view(), name='calendar_event_group'),
    path('calendar-events/<str:client_id>/', CalendarEventDetailView.as_view(), name='calendar_event_detail'),
]
