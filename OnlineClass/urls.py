from django.urls import path

from .views import (
    ManagerOnlineClassDetailView,
    ManagerOnlineClassListCreateView,
    StudentOnlineClassJoinView,
    StudentOnlineClassListView,
)

urlpatterns = [
    path('manager/', ManagerOnlineClassListCreateView.as_view(), name='manager_online_class_list'),
    path('manager/<int:online_class_id>/', ManagerOnlineClassDetailView.as_view(), name='manager_online_class_detail'),
    path('my/', StudentOnlineClassListView.as_view(), name='student_online_class_list'),
    path('<int:online_class_id>/join/', StudentOnlineClassJoinView.as_view(), name='student_online_class_join'),
]
