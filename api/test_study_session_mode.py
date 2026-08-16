"""آزمون ثبت جلسه مطالعه با حالت تست‌زنی و count_test."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import StudySession, Subject, UserProfile

SESSIONS_URL = '/api/sessions/'


class StudySessionTestModeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username='09123334455')
        UserProfile.objects.create(
            user=self.user,
            phone_number='09123334455',
            role='student',
            is_password_set=True,
            is_profile_complete=True,
        )
        self.subject = Subject.objects.create(
            user=self.user, name='شیمی', color_code='#10b981',
        )
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def _payload(self, **overrides):
        now = timezone.now()
        data = {
            'subject_name': 'شیمی',
            'description': '',
            'start_time': (now - timedelta(minutes=40)).isoformat(),
            'end_time': now.isoformat(),
            'mode': 'study',
        }
        data.update(overrides)
        return data

    def test_create_test_mode_with_count(self):
        res = self.client.post(
            SESSIONS_URL,
            self._payload(mode='test', count_test=25),
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['mode'], 'test')
        self.assertEqual(res.data['count_test'], 25)
        row = StudySession.objects.get(id=res.data['id'])
        self.assertEqual(row.mode, StudySession.MODE_TEST)
        self.assertEqual(row.count_test, 25)

    def test_count_test_cleared_when_mode_is_not_test(self):
        res = self.client.post(
            SESSIONS_URL,
            self._payload(mode='study', count_test=10),
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['mode'], 'study')
        self.assertIsNone(res.data['count_test'])

    def test_count_test_optional_and_nullable(self):
        res = self.client.post(
            SESSIONS_URL,
            self._payload(mode='test', count_test=None),
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['mode'], 'test')
        self.assertIsNone(res.data['count_test'])

    def test_rejects_zero_count_in_test_mode(self):
        res = self.client.post(
            SESSIONS_URL,
            self._payload(mode='test', count_test=0),
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('count_test', res.data)
