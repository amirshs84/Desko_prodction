"""آزمون اندپوینت رویدادهای ثابت کلاس (مدیر مدرسه).

سنجه‌ی اصلی: یک‌بار تعریف برنامه‌ی کلاس توسط مدیر، روی تقویم همه‌ی دانش‌آموزان عضو
آن کلاس بنشیند (fan-out) و نه بیشتر — نه دانش‌آموز کلاس دیگر، نه مدرسه‌ی دیگر.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import ClassEnrollment, School, SchoolClass, UserProfile

from Planning.models import CalendarEventModel


class ClassFixedEventApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')

        self.manager = self._make_user('09120000100', role='manager', school=self.school)
        self.school_class = SchoolClass.objects.create(
            school=self.school, code='10A', name='دهم ریاضی', grade='10',
        )
        self.students = [
            self._make_user('0912000020{}'.format(index), school=self.school)
            for index in range(2)
        ]
        for student in self.students:
            ClassEnrollment.objects.create(
                school_class=self.school_class, student=student.profile,
            )
        # دانش‌آموزی که عضو این کلاس نیست و نباید رویدادی بگیرد
        self.outsider = self._make_user('09120000300', school=self.school)
        self.authenticate(self.manager)

    def _make_user(self, phone: str, *, role: str = 'student', school: School | None = None) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(user=user, phone_number=phone, role=role, school=school)
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def url(self, class_id: int | None = None) -> str:
        return f'/api/planning/manager/classes/{class_id or self.school_class.id}/fixed-events/'

    def test_weekly_recurrence_fans_out_to_class_members(self):
        response = self.client.post(
            self.url(),
            {
                'title': 'ریاضی ۱',
                'description': 'کلاس مدرسه',
                'start_minutes': 480,
                'end_minutes': 570,
                'recurrence': {
                    'weekdays': [0, 2],
                    'start': {'jy': 1404, 'jm': 5, 'jd': 4},
                    'end': {'jy': 1404, 'jm': 5, 'jd': 17},
                },
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['student_count'], 2)
        self.assertEqual(len(response.data['dates']), 4)
        self.assertEqual(response.data['created_count'], 8)
        self.assertEqual(response.data['skipped_count'], 0)

        rows = CalendarEventModel.objects.all()
        self.assertEqual(rows.count(), 8)
        self.assertEqual({row.kind for row in rows}, {'immutable'})
        self.assertEqual({row.origin for row in rows}, {'school'})
        self.assertEqual({row.group_id for row in rows}, {response.data['group_id']})
        self.assertEqual(
            set(rows.values_list('user_id', flat=True)),
            {student.id for student in self.students},
        )
        self.assertEqual(rows.filter(user=self.outsider).count(), 0)

    def test_explicit_dates_are_used_as_is(self):
        response = self.client.post(
            self.url(),
            {
                'title': 'آزمون هفتگی',
                'start_minutes': 600,
                'end_minutes': 690,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}, {'jy': 1404, 'jm': 5, 'jd': 4}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        # روز تکراری یک‌بار حساب می‌شود
        self.assertEqual(len(response.data['dates']), 1)
        self.assertEqual(response.data['created_count'], 2)

    def test_rejects_missing_or_conflicting_schedule(self):
        base = {'title': 'x', 'start_minutes': 480, 'end_minutes': 570}
        empty = self.client.post(self.url(), base, format='json')
        self.assertEqual(empty.status_code, 400)

        both = self.client.post(
            self.url(),
            {
                **base,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}],
                'recurrence': {
                    'weekdays': [0],
                    'start': {'jy': 1404, 'jm': 5, 'jd': 4},
                    'end': {'jy': 1404, 'jm': 5, 'jd': 11},
                },
            },
            format='json',
        )
        self.assertEqual(both.status_code, 400)

    def test_rejects_invalid_time_range(self):
        response = self.client.post(
            self.url(),
            {
                'title': 'x',
                'start_minutes': 600,
                'end_minutes': 600,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID_TIME_RANGE')

    def test_list_and_delete_group(self):
        created = self.client.post(
            self.url(),
            {
                'title': 'ریاضی ۱',
                'start_minutes': 480,
                'end_minutes': 570,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}, {'jy': 1404, 'jm': 5, 'jd': 11}],
            },
            format='json',
        )
        group_id = created.data['group_id']

        listed = self.client.get(self.url())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        group = listed.data[0]
        self.assertEqual(group['group_id'], group_id)
        self.assertEqual(group['student_count'], 2)
        self.assertEqual(group['event_count'], 4)
        self.assertEqual(len(group['dates']), 2)

        deleted = self.client.delete(f'{self.url()}{group_id}/')
        self.assertEqual(deleted.status_code, 200, deleted.data)
        self.assertEqual(deleted.data['deleted'], 4)
        self.assertEqual(CalendarEventModel.objects.count(), 0)

        missing = self.client.delete(f'{self.url()}{group_id}/')
        self.assertEqual(missing.status_code, 404)

    def test_class_of_another_school_is_not_visible(self):
        foreign_class = SchoolClass.objects.create(
            school=self.other_school, code='11B', name='یازدهم تجربی', grade='11',
        )
        response = self.client.post(
            self.url(foreign_class.id),
            {
                'title': 'x',
                'start_minutes': 480,
                'end_minutes': 570,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['error']['code'], 'NOT_FOUND')

    def test_empty_class_is_rejected(self):
        empty_class = SchoolClass.objects.create(
            school=self.school, code='12C', name='دوازدهم', grade='12',
        )
        response = self.client.post(
            self.url(empty_class.id),
            {
                'title': 'x',
                'start_minutes': 480,
                'end_minutes': 570,
                'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_consultant_and_student_cannot_create_fixed_events(self):
        consultant = self._make_user('09120000400', role='consultant', school=self.school)
        for user in (consultant, self.students[0]):
            with self.subTest(user=user.username):
                self.authenticate(user)
                response = self.client.post(
                    self.url(),
                    {
                        'title': 'x',
                        'start_minutes': 480,
                        'end_minutes': 570,
                        'dates': [{'jy': 1404, 'jm': 5, 'jd': 4}],
                    },
                    format='json',
                )
                self.assertEqual(response.status_code, 403)
                self.assertEqual(CalendarEventModel.objects.count(), 0)
