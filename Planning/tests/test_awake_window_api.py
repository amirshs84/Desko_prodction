"""آزمون بازه‌ی فعال شبانه‌روز: خواندن، ویرایش توسط دانش‌آموز، و اثرش روی چیدمان."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

from Planning.models import CalendarEventModel, StudentAwakeWindowModel

URL = '/api/planning/calendar/awake-window/'
PLACE_URL = '/api/planning/calendar/blocks/'
DATE = '1404-05-03'


class AwakeWindowApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')
        self.student = self.make_user('09120000001', school=self.school)
        self.other_student = self.make_user('09120000002', school=self.school)
        self.consultant = self.make_user(
            '09120000100', role='consultant', school=self.school,
        )
        self.foreign_consultant = self.make_user(
            '09120000101', role='consultant', school=self.other_school,
        )
        self.authenticate(self.student)

    def make_user(self, phone: str, *, role: str = 'student', school=None) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(user=user, phone_number=phone, role=role, school=school)
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    # ---------- خواندن ----------

    def test_default_is_seven_to_eleven_pm_without_a_stored_row(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['start_minutes'], 420)
        self.assertEqual(response.data['end_minutes'], 1380)
        self.assertTrue(response.data['is_default'])
        self.assertFalse(StudentAwakeWindowModel.objects.exists())

    def test_consultant_of_the_same_school_can_read_it(self):
        self.authenticate(self.consultant)
        response = self.client.get(f'{URL}?user={self.student.id}')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['start_minutes'], 420)

    def test_consultant_of_another_school_is_blocked(self):
        self.authenticate(self.foreign_consultant)
        response = self.client.get(f'{URL}?user={self.student.id}')
        self.assertEqual(response.status_code, 403)

    # ---------- نوشتن ----------

    def test_student_can_edit_their_own_window(self):
        response = self.client.put(
            URL, {'start_minutes': 330, 'end_minutes': 1410}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['start_minutes'], 330)
        self.assertEqual(response.data['capacity_minutes'], 1080)
        self.assertFalse(response.data['is_default'])

        row = StudentAwakeWindowModel.objects.get(user=self.student)
        self.assertEqual((row.start_minutes, row.end_minutes), (330, 1410))

    def test_reset_returns_to_the_default(self):
        self.client.put(URL, {'start_minutes': 480, 'end_minutes': 1320}, format='json')
        response = self.client.delete(URL)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['is_default'])
        self.assertFalse(StudentAwakeWindowModel.objects.exists())

    def test_a_window_shorter_than_the_minimum_is_rejected(self):
        response = self.client.put(
            URL, {'start_minutes': 540, 'end_minutes': 600}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')

    def test_a_reversed_window_is_rejected(self):
        response = self.client.put(
            URL, {'start_minutes': 1380, 'end_minutes': 420}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_consultant_cannot_edit_a_students_window(self):
        self.authenticate(self.consultant)
        response = self.client.put(
            f'{URL}?user={self.student.id}',
            {'start_minutes': 300, 'end_minutes': 1400},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(StudentAwakeWindowModel.objects.exists())

    def test_windows_are_isolated_per_student(self):
        self.client.put(URL, {'start_minutes': 300, 'end_minutes': 1320}, format='json')
        self.authenticate(self.other_student)
        response = self.client.get(URL)
        self.assertEqual(response.data['start_minutes'], 420)

    # ---------- اثر روی چیدمان ----------

    def test_placement_respects_the_edited_window(self):
        self.client.put(URL, {'start_minutes': 600, 'end_minutes': 1320}, format='json')
        response = self.client.post(
            PLACE_URL, {'date': DATE, 'template': 'study_90'}, format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['event']['start_minutes'], 600)
        self.assertTrue(CalendarEventModel.objects.filter(user=self.student).exists())
