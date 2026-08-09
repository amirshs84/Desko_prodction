"""آزمون پیشخوان مشاور — ساختار پاسخ و کنترل دسترسی."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

DASHBOARD_URL = '/api/planning/consultant/dashboard/'


class ConsultantDashboardApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='مدرسه پیشخوان', invitation_code='DASH1234')
        self.consultant = self._make_user('09121000100', role='consultant', school=self.school)
        self.student = self._make_user(
            '09121000200', school=self.school, full_name='رضا نوری',
        )
        self.manager = self._make_user('09121000101', role='manager', school=self.school)
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

    def test_dashboard_shape(self):
        response = self.client.get(DASHBOARD_URL)
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertIn('gamification', data)
        self.assertIn('avg_completion_percent', data['gamification'])
        self.assertIn('sparkline_hours', data['gamification'])
        self.assertIn('top_performers', data)
        self.assertIn('at_risk', data)
        self.assertIn('rising_stars', data)
        self.assertIn('pending', data)
        self.assertIn('inbox', data)
        self.assertIn('live_feed', data)
        self.assertLessEqual(len(data['top_performers']), 5)
        self.assertLessEqual(len(data['at_risk']), 5)

    def test_manager_forbidden(self):
        self.authenticate(self.manager)
        response = self.client.get(DASHBOARD_URL)
        self.assertIn(response.status_code, (403, 401))
