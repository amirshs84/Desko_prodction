from django.urls import path, include
from rest_framework.routers import DefaultRouter
from notifications.views import NotificationInboxViewSet, NotificationTrackView, RegisterDeviceView

router = DefaultRouter()
router.register(r'inbox', NotificationInboxViewSet, basename='notification-inbox')

urlpatterns = [
    path('', include(router.urls)),
    path('track/<int:pk>/', NotificationTrackView.as_view(), name='notification-track'),
    path('device/register/', RegisterDeviceView.as_view(), name='register-device'),
]
