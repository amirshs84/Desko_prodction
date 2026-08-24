from django.urls import path

from .views import (
    ConsultantExamBookletView,
    ConsultantExamDetailView,
    ConsultantExamListCreateView,
    ConsultantExamSessionListCreateView,
    ConsultantSessionDetailView,
    ConsultantSessionParticipantDeleteView,
    ConsultantSessionParticipantsView,
    ConsultantSessionResultDetailView,
    ConsultantSessionResultsView,
    ManagerExamSessionListView,
    ManagerExamSessionResultsView,
    StudentAttemptDetailView,
    StudentAttemptProblemsView,
    StudentAttemptResultView,
    StudentMyExamSessionsView,
    StudentSendAnswerView,
    StudentSessionBookletView,
    StudentStartAttemptView,
    StudentSubmitAttemptView,
)

urlpatterns = [
    path('exams/', ConsultantExamListCreateView.as_view(), name='exam_list_create'),
    path('exams/<int:exam_id>/', ConsultantExamDetailView.as_view(), name='exam_detail'),
    path('exams/<int:exam_id>/booklet/', ConsultantExamBookletView.as_view(), name='exam_booklet'),
    path(
        'exams/<int:exam_id>/sessions/',
        ConsultantExamSessionListCreateView.as_view(),
        name='exam_session_create',
    ),
    path('exam-sessions/<int:session_id>/', ConsultantSessionDetailView.as_view(), name='exam_session_detail'),
    path(
        'exam-sessions/<int:session_id>/participants/',
        ConsultantSessionParticipantsView.as_view(),
        name='exam_session_participants',
    ),
    path(
        'exam-sessions/<int:session_id>/participants/<int:user_id>/',
        ConsultantSessionParticipantDeleteView.as_view(),
        name='exam_session_participant_delete',
    ),
    path(
        'exam-sessions/<int:session_id>/results/',
        ConsultantSessionResultsView.as_view(),
        name='exam_session_results',
    ),
    path(
        'exam-sessions/<int:session_id>/results/<int:user_id>/',
        ConsultantSessionResultDetailView.as_view(),
        name='exam_session_result_detail',
    ),
    path('me/exam-sessions/', StudentMyExamSessionsView.as_view(), name='my_exam_sessions'),
    path(
        'exam-sessions/<int:session_id>/booklet/',
        StudentSessionBookletView.as_view(),
        name='exam_session_booklet',
    ),
    path(
        'exam-sessions/<int:session_id>/attempts/',
        StudentStartAttemptView.as_view(),
        name='exam_session_start_attempt',
    ),
    path('attempts/<uuid:attempt_id>/', StudentAttemptDetailView.as_view(), name='attempt_detail'),
    path(
        'attempts/<uuid:attempt_id>/problems/',
        StudentAttemptProblemsView.as_view(),
        name='attempt_problems',
    ),
    path(
        'attempts/<uuid:attempt_id>/answers/',
        StudentSendAnswerView.as_view(),
        name='attempt_send_answer',
    ),
    path(
        'attempts/<uuid:attempt_id>/submit/',
        StudentSubmitAttemptView.as_view(),
        name='attempt_submit',
    ),
    path(
        'attempts/<uuid:attempt_id>/result/',
        StudentAttemptResultView.as_view(),
        name='attempt_result',
    ),
    path('manager/exam-sessions/', ManagerExamSessionListView.as_view(), name='manager_exam_sessions'),
    path(
        'manager/exam-sessions/<int:session_id>/results/',
        ManagerExamSessionResultsView.as_view(),
        name='manager_exam_session_results',
    ),
]
