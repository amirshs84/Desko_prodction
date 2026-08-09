"""آزمون ترجیحات مشاور."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

PREFS_URL = '/api/planning/consultant/preferences/'


class ConsultantPreferencesApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='مدرسه تنظیمات', invitation_code='PREF1234')
        self.consultant = self._make_user(
            '09123000100', role='consultant', school=self.school, full_name='سارا مشاور',
        )
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

    def test_get_defaults(self):
        response = self.client.get(PREFS_URL)
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertEqual(data['identity']['full_name'], 'سارا مشاور')
        self.assertEqual(data['identity']['school_name'], 'مدرسه تنظیمات')
        self.assertIn('performance', data['visible_roster_columns'])
        self.assertTrue(data['notifications']['direct_messages'])
        self.assertEqual(data['working_hours']['timezone'], 'Asia/Tehran')

    def test_patch_quick_replies_and_columns(self):
        response = self.client.patch(
            PREFS_URL,
            {
                'quick_replies': [
                    {'title': 'آفرین', 'body': 'آفرین، ادامه بده.'},
                ],
                'visible_roster_columns': ['performance', 'study_seconds', 'grade'],
                'notifications': {'dashboard_alerts': False},
                'working_hours': {
                    'start': '08:30',
                    'end': '16:00',
                    'days': ['sat', 'sun', 'mon'],
                },
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['quick_replies']), 1)
        self.assertEqual(response.data['quick_replies'][0]['body'], 'آفرین، ادامه بده.')
        self.assertEqual(
            response.data['visible_roster_columns'],
            ['performance', 'study_seconds', 'grade'],
        )
        self.assertFalse(response.data['notifications']['dashboard_alerts'])
        self.assertEqual(response.data['working_hours']['start'], '08:30')
