from django.urls import path

from . import views

urlpatterns = [
    path("devices/", views.DeviceView.as_view(), name="notify-devices"),
    path("events/batch/", views.TrackEventsView.as_view(), name="notify-events-batch"),
    path("inbox/", views.InboxView.as_view(), name="notify-inbox"),
    path("inbox/read/", views.InboxReadView.as_view(), name="notify-inbox-read"),
    path("inbox/unread-count/", views.UnreadCountView.as_view(), name="notify-unread-count"),
    path("in-app/pending/", views.PendingInAppView.as_view(), name="notify-in-app-pending"),
    path("preferences/", views.PreferencesView.as_view(), name="notify-preferences"),
    path("local-schedule/", views.LocalScheduleView.as_view(), name="notify-local-schedule"),
    path("admin/test-send/", views.AdminTestSendView.as_view(), name="notify-admin-test-send"),
]
