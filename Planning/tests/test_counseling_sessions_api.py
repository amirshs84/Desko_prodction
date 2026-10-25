"""آزمون جلسات مشاوره و محدوده‌ی روز."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

TEHRAN = ZoneInfo('Asia/Tehran')
SESSIONS_URL = '/api/planning/consultant/sessions/'


class CounselingSessionApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='مدرسه جلسه', invitation_code='SESS1234')
        self.other = School.objects.create(name='مدرسه دیگر', invitation_code='SESS9999')
        self.consultant = self._make_user(
            '09123000200', role='consultant', school=self.school, full_name='سارا مشاور',
        )
        self.student = self._make_user(
            '09123000201', role='student', school=self.school, full_name='آرین کاظمی',
        )
        self.outsider = self._make_user(
            '09123000202', role='student', school=self.other, full_name='دانش‌آموز غریبه',
        )
        self.authenticate(self.consultant)

    def _make_user(
        self, phone: str, *, role: str, school: School, full_name: str,
    ) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=school, full_name=full_name,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_create_list_update_and_day_filter(self):
        created = self.client.post(
            SESSIONS_URL,
            {
                'student_id': self.student.id,
                'title': 'مدیریت استرس',
                'starts_at': datetime(2026, 10, 25, 9, 30, tzinfo=TEHRAN).isoformat(),
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        session_id = created.data['id']
        self.assertEqual(created.data['student_name'], 'آرین کاظمی')
        self.assertEqual(created.data['status'], 'scheduled')

        today = self.client.get(SESSIONS_URL, {'on': '2026-10-25'})
        self.assertEqual(today.status_code, 200, today.data)
        self.assertEqual([item['id'] for item in today.data], [session_id])

        other_day = self.client.get(SESSIONS_URL, {'on': '2026-10-24'})
        self.assertEqual(other_day.data, [])

        history = self.client.get(SESSIONS_URL, {'student': self.student.id})
        self.assertEqual(len(history.data), 1)

        updated = self.client.patch(
            f'{SESSIONS_URL}{session_id}/',
            {'status': 'held'},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data['status'], 'held')

        deleted = self.client.delete(f'{SESSIONS_URL}{session_id}/')
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(SESSIONS_URL, {'student': self.student.id}).data, [])

    def test_reject_student_from_another_school(self):
        response = self.client.post(
            SESSIONS_URL,
            {
                'student_id': self.outsider.id,
                'title': 'جلسه نامعتبر',
                'starts_at': datetime(2026, 10, 25, 11, 0, tzinfo=TEHRAN).isoformat(),
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.data)

    def test_reject_blank_title(self):
        response = self.client.post(
            SESSIONS_URL,
            {
                'student_id': self.student.id,
                'title': '   ',
                'starts_at': datetime(2026, 10, 25, 11, 0, tzinfo=TEHRAN).isoformat(),
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.data)
