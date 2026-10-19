from django.contrib import admin
from django.urls import include, path

from Ai.interfaces.web.views import chat_page

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/', include('Planning.urls')),
    path('api/online-classes/', include('OnlineClass.urls')),
    path('api/ai/', include('Ai.interfaces.rest.urls')),
    path('api/', include('Exam.urls')),
    path('api/notifications/', include('notifications.urls')),
    # صفحه‌ی چت ساده (dev) برای تست دستی مسیر انتها-به-انتها.
    path('', chat_page, name='ai-chat'),
]
