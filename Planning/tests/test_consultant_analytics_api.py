"""آزمون هاب گزارش مشاور."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

ANALYTICS_URL = '/api/planning/consultant/analytics/'


class ConsultantAnalyticsApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='مدرسه گزارش', invitation_code='ANLY1234')
        self.consultant = self._make_user('09122000100', role='consultant', school=self.school)
        self._make_user('09122000200', school=self.school, full_name='مینا رضایی')
        self.authenticate(self.consultant)

    def _make_user(
        self, phone: str, *, role: str = 'student', school: School | None = None,
        full_name: str = '',
    ) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=school, full_name=full_name,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_analytics_shape(self):
        response = self.client.get(ANALYTICS_URL, {'period': 'weekly'})
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        for key in (
            'class_performance', 'subject_radar', 'study_trend', 'cohort_flow',
            'exam_trend', 'plan_execution', 'recent_actions',
        ):
            self.assertIn(key, data)
        self.assertFalse(data['exam_trend']['available'])
        self.assertIn('accept_rate', data['plan_execution'])
        self.assertIn('nodes', data['cohort_flow'])
        self.assertIn('links', data['cohort_flow'])
