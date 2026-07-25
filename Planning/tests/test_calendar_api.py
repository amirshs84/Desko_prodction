"""آزمون انتها‌به‌انتهای اندپوینت‌های تقویم.

دو هدف دارد:
  1. رگرسیون: قرارداد فعلی فرانت‌اند (``/api/calendar-events/...``) پس از بازچینش
     معماری، مو‌به‌مو سرِ جای خودش باشد.
  2. قواعد جدید: رویداد ثابت مدرسه دست‌نخوردنی بماند و دسترسی مشاور به تقویم
     دانش‌آموز، محدود به مدرسه‌ی خودش باشد.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

from Planning.models import CalendarEventModel

EVENT = {
    'client_id': 'evt-1',
    'group_id': '',
    'jy': 1404,
    'jm': 5,
    'jd': 4,
    'title': 'ریاضی',
    'description': 'فصل ۲',
    'start_minutes': 480,
    'end_minutes': 570,
    'color': '#10b981',
    'all_day': False,
    'created_at': '2026-01-01T00:00:00Z',
}


def make_user(phone: str, *, role: str = 'student', school: School | None = None) -> User:
    user = User.objects.create(username=phone)
    UserProfile.objects.create(user=user, phone_number=phone, role=role, school=school)
    return user


class CalendarApiTestCase(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.student = make_user('09120000001', school=self.school)
        self.authenticate(self.student)

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def create_event(self, **overrides) -> dict:
        payload = {**EVENT, **overrides}
        response = self.client.post('/api/calendar-events/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data


class StudentCalendarContractTests(CalendarApiTestCase):
    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get('/api/calendar-events/').status_code, 401)

    def test_create_single_event_returns_same_shape(self):
        data = self.create_event()
        for key in EVENT:
            if key == 'created_at':
                continue
            self.assertEqual(data[key], EVENT[key], key)
        self.assertEqual(data['kind'], 'mutable')
        self.assertEqual(data['origin'], 'student')
        self.assertEqual(data['version'], 1)
        self.assertIsNotNone(data['created_at'])

    def test_bulk_create_is_idempotent(self):
        payload = [EVENT, {**EVENT, 'client_id': 'evt-2', 'jd': 5}]
        first = self.client.post('/api/calendar-events/', payload, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(len(first.data), 2)

        retry = self.client.post('/api/calendar-events/', payload, format='json')
        self.assertEqual(retry.status_code, 201)
        self.assertEqual(CalendarEventModel.objects.count(), 2)

    def test_list_returns_only_own_events(self):
        self.create_event()
        other = make_user('09120000009', school=self.school)
        self.authenticate(other)
        self.create_event(client_id='other-evt')

        self.authenticate(self.student)
        response = self.client.get('/api/calendar-events/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['client_id'] for item in response.data], ['evt-1'])

    def test_list_can_be_limited_to_a_date_range(self):
        self.create_event()
        self.create_event(client_id='evt-far', jm=7, jd=1)
        response = self.client.get('/api/calendar-events/?from=1404-05-01&to=1404-05-30')
        self.assertEqual([item['client_id'] for item in response.data], ['evt-1'])

    def test_retrieve_patch_and_delete(self):
        self.create_event()
        detail = self.client.get('/api/calendar-events/evt-1/')
        self.assertEqual(detail.status_code, 200)

        patched = self.client.patch(
            '/api/calendar-events/evt-1/',
            {'title': 'فیزیک', 'start_minutes': 600, 'end_minutes': 690, 'jd': 6},
            format='json',
        )
        self.assertEqual(patched.status_code, 200, patched.data)
        self.assertEqual(patched.data['title'], 'فیزیک')
        self.assertEqual(patched.data['jd'], 6)
        self.assertEqual(patched.data['start_minutes'], 600)
        self.assertEqual(patched.data['version'], 2)

        row = CalendarEventModel.objects.get(client_id='evt-1')
        self.assertEqual(str(row.date), '2025-07-28')  # ستون میلادی همگام مانده

        self.assertEqual(self.client.delete('/api/calendar-events/evt-1/').status_code, 204)
        self.assertEqual(CalendarEventModel.objects.count(), 0)

    def test_patch_partial_time_keeps_other_end(self):
        self.create_event()
        patched = self.client.patch(
            '/api/calendar-events/evt-1/', {'start_minutes': 500}, format='json',
        )
        self.assertEqual(patched.data['start_minutes'], 500)
        self.assertEqual(patched.data['end_minutes'], 570)

    def test_invalid_time_range_is_rejected(self):
        self.create_event()
        response = self.client.patch(
            '/api/calendar-events/evt-1/', {'start_minutes': 600}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID_TIME_RANGE')

    def test_missing_event_returns_not_found(self):
        response = self.client.patch(
            '/api/calendar-events/ghost/', {'title': 'x'}, format='json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['error']['code'], 'NOT_FOUND')

    def test_group_patch_and_delete(self):
        self.create_event(client_id='g-1', group_id='grp')
        self.create_event(client_id='g-2', group_id='grp', jd=11)

        patched = self.client.patch(
            '/api/calendar-events/group/grp/',
            {'title': 'زیست', 'color': '#ff0000'},
            format='json',
        )
        self.assertEqual(patched.status_code, 200, patched.data)
        self.assertEqual(patched.data, {'updated': 2})
        self.assertEqual(
            list(CalendarEventModel.objects.values_list('title', flat=True)), ['زیست', 'زیست'],
        )

        missing = self.client.patch(
            '/api/calendar-events/group/nope/', {'title': 'x'}, format='json',
        )
        self.assertEqual(missing.status_code, 404)

        self.assertEqual(self.client.delete('/api/calendar-events/group/grp/').status_code, 204)
        self.assertEqual(CalendarEventModel.objects.count(), 0)


class ImmutableEventGuardTests(CalendarApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.fixed = CalendarEventModel.objects.create(
            user=self.student,
            client_id='school-1',
            group_id='school-grp',
            jy=1404, jm=5, jd=4,
            date='2025-07-26',
            title='کلاس ریاضی',
            start_minutes=600,
            end_minutes=690,
            kind='immutable',
            origin='school',
        )

    def test_student_sees_fixed_events(self):
        response = self.client.get('/api/calendar-events/')
        kinds = {item['client_id']: item['kind'] for item in response.data}
        self.assertEqual(kinds, {'school-1': 'immutable'})

    def test_student_cannot_move_or_delete_fixed_event(self):
        patched = self.client.patch(
            '/api/calendar-events/school-1/', {'jd': 6}, format='json',
        )
        self.assertEqual(patched.status_code, 409)
        self.assertEqual(patched.data['error']['code'], 'IMMUTABLE_EVENT_VIOLATION')

        deleted = self.client.delete('/api/calendar-events/school-1/')
        self.assertEqual(deleted.status_code, 409)
        self.assertEqual(CalendarEventModel.objects.filter(client_id='school-1').count(), 1)

    def test_group_operations_cannot_bypass_the_rule(self):
        patched = self.client.patch(
            '/api/calendar-events/group/school-grp/', {'title': 'x'}, format='json',
        )
        self.assertEqual(patched.status_code, 409)

        deleted = self.client.delete('/api/calendar-events/group/school-grp/')
        self.assertEqual(deleted.status_code, 409)
        self.assertEqual(CalendarEventModel.objects.count(), 1)

    def test_consultant_cannot_move_fixed_event_either(self):
        consultant = make_user('09120000005', role='consultant', school=self.school)
        self.authenticate(consultant)
        response = self.client.patch(
            f'/api/calendar-events/school-1/?user={self.student.id}', {'jd': 6}, format='json',
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'IMMUTABLE_EVENT_VIOLATION')


class ConsultantCalendarAccessTests(CalendarApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.create_event()
        self.consultant = make_user('09120000010', role='consultant', school=self.school)
        other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')
        self.outsider = make_user('09120000011', role='consultant', school=other_school)

    def test_consultant_reads_student_calendar_of_own_school(self):
        self.authenticate(self.consultant)
        response = self.client.get(f'/api/calendar-events/?user={self.student.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['client_id'] for item in response.data], ['evt-1'])

    def test_consultant_can_add_and_move_student_events(self):
        self.authenticate(self.consultant)
        created = self.client.post(
            f'/api/calendar-events/?user={self.student.id}',
            {**EVENT, 'client_id': 'from-consultant'},
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['origin'], 'consultant')

        moved = self.client.patch(
            f'/api/calendar-events/from-consultant/?user={self.student.id}',
            {'jd': 6, 'start_minutes': 600, 'end_minutes': 690},
            format='json',
        )
        self.assertEqual(moved.status_code, 200, moved.data)
        self.assertEqual(moved.data['jd'], 6)
        self.assertEqual(
            CalendarEventModel.objects.get(client_id='from-consultant').user_id, self.student.id,
        )

    def test_consultant_of_another_school_is_blocked(self):
        self.authenticate(self.outsider)
        response = self.client.get(f'/api/calendar-events/?user={self.student.id}')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error']['code'], 'SCHOOL_MISMATCH')

    def test_student_cannot_read_another_calendar(self):
        classmate = make_user('09120000012', school=self.school)
        self.authenticate(classmate)
        response = self.client.get(f'/api/calendar-events/?user={self.student.id}')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error']['code'], 'FORBIDDEN')

    def test_invalid_user_param_is_rejected(self):
        self.authenticate(self.consultant)
        response = self.client.get('/api/calendar-events/?user=abc')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')
