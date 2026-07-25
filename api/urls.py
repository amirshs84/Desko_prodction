from django.urls import path
from .views import (
    request_otp,
    phone_login,
    check_phone,
    register_with_password,
    login_with_password,
    UserProfileView,
    update_study_status,
    PDFReadProgressView,
    SubjectListView,
    SubjectDetailView,
    StudySessionListCreateView,
    DashboardStatsView,
    CreateTicketView,
    StudentTicketListView,
    # Notification Views
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    # Manager Panel Views
    ManagerDashboardKPIView,
    ManagerAttendanceView,
    ManagerStudentListView,
    ManagerStudentProfileView,
    ManagerExportExcelView,
    ManagerStudentReportPDFView,
    ManagerTicketListView,
    ManagerTicketReplyView,
    ManagerClassListCreateView,
    ManagerClassDetailView,
    ManagerClassStudentsView,
    ManagerClassStudentRemoveView,
    ManagerSchoolSettingsView,
    ManagerChangePasswordView,
    # SuperAdmin Panel Views
    SuperAdminSchoolListCreateView,
    SuperAdminSchoolDetailView,
    SuperAdminAssignManagerView,
    SuperAdminConsultantsView,
    SuperAdminSchoolMembersView,
    SuperAdminCreateStudentView,
    SuperAdminTicketListView,
    SuperAdminTicketReplyView,
    SuperAdminNotificationView,
)

urlpatterns = [
    # Auth & Profile - New Password-based
    path('auth/check-phone/', check_phone, name='check_phone'),
    path('auth/register/', register_with_password, name='register'),
    path('auth/login/', login_with_password, name='login'),
    
    # Auth & Profile - Legacy OTP
    path('auth/request-otp/', request_otp, name='request_otp'),
    path('auth/otp-login/', phone_login, name='phone_login'),
    
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('profile/study-status/', update_study_status, name='update_study_status'),
    path('pdf-progress/', PDFReadProgressView.as_view(), name='pdf_progress'),
    
    # Study Data
    path('subjects/', SubjectListView.as_view(), name='subject_list'),
    path('subjects/<int:pk>/', SubjectDetailView.as_view(), name='subject_detail'),
    path('sessions/', StudySessionListCreateView.as_view(), name='study_sessions'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # Tickets / Messaging
    path('tickets/', CreateTicketView.as_view(), name='create_ticket'),
    path('tickets/my/', StudentTicketListView.as_view(), name='my_tickets'),

    # Notifications (student & manager receive)
    path('notifications/',            NotificationListView.as_view(),       name='notification_list'),
    path('notifications/unread/',     NotificationUnreadCountView.as_view(), name='notification_unread'),
    path('notifications/mark-read/',  NotificationMarkReadView.as_view(),    name='notification_mark_read'),
    
    # Manager Panel
    path('manager/dashboard/', ManagerDashboardKPIView.as_view(), name='manager_dashboard_kpi'),
    path('manager/attendance/', ManagerAttendanceView.as_view(), name='manager_attendance'),
    path('manager/students/', ManagerStudentListView.as_view(), name='manager_student_list'),
    path('manager/students/<int:user_id>/profile/', ManagerStudentProfileView.as_view(), name='manager_student_profile'),
    path('manager/export/excel/', ManagerExportExcelView.as_view(), name='manager_export_excel'),
    path('manager/students/<int:user_id>/report/pdf/', ManagerStudentReportPDFView.as_view(), name='manager_student_pdf'),
    path('manager/tickets/', ManagerTicketListView.as_view(), name='manager_ticket_list'),
    path('manager/tickets/<int:ticket_id>/reply/', ManagerTicketReplyView.as_view(), name='manager_ticket_reply'),
    path('manager/classes/', ManagerClassListCreateView.as_view(), name='manager_class_list'),
    path('manager/classes/<int:class_id>/', ManagerClassDetailView.as_view(), name='manager_class_detail'),
    path('manager/classes/<int:class_id>/students/', ManagerClassStudentsView.as_view(), name='manager_class_students'),
    path('manager/classes/<int:class_id>/students/<int:user_id>/', ManagerClassStudentRemoveView.as_view(), name='manager_class_student_remove'),
    path('manager/school/', ManagerSchoolSettingsView.as_view(), name='manager_school_settings'),
    path('manager/change-password/', ManagerChangePasswordView.as_view(), name='manager_change_password'),
    
    # SuperAdmin Panel
    path('superadmin/schools/', SuperAdminSchoolListCreateView.as_view(), name='superadmin_schools'),
    path('superadmin/schools/<int:pk>/', SuperAdminSchoolDetailView.as_view(), name='superadmin_school_detail'),
    path('superadmin/schools/<int:school_id>/assign-manager/', SuperAdminAssignManagerView.as_view(), name='superadmin_assign_manager'),
    path('superadmin/schools/<int:school_id>/consultants/', SuperAdminConsultantsView.as_view(), name='superadmin_consultants'),
    path('superadmin/schools/<int:school_id>/members/', SuperAdminSchoolMembersView.as_view(), name='superadmin_school_members'),
    path('superadmin/schools/<int:school_id>/students/', SuperAdminCreateStudentView.as_view(), name='superadmin_create_student'),
    path('superadmin/tickets/', SuperAdminTicketListView.as_view(), name='superadmin_ticket_list'),
    path('superadmin/tickets/<int:ticket_id>/reply/', SuperAdminTicketReplyView.as_view(), name='superadmin_ticket_reply'),
    path('superadmin/notifications/', SuperAdminNotificationView.as_view(), name='superadmin_notifications'),
]
