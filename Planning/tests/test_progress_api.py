"""آزمون گزارش پیشرفت: مشاور و دانش‌آموز باید بیت‌به‌بیت یک عدد ببینند."""
from __future__ import annotations

from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, Subject, StudySession, UserProfile

from Planning.reporting.application.iran_clock import IRAN_TZ

PROGRESS_URL = '/api/planning/progress/'
DASHBOARD_STATS_URL = '/api/dashboard/stats/'
MANAGER_PROFILE_URL = '/api/manager/students/{}/profile/'


class ProgressApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='الف', invitation_code='ALEF1234')
        self.other = School.objects.create(name='ب', invitation_code='BE123456')
        self.student = self.make_user(
            '09120000001', school=self.school, full_name='علی', grade='11', olympiad='math',
        )
        self.consultant = self.make_user('09120000100', role='consultant', school=self.school)
        self.manager = self.make_user('09120000102', role='manager', school=self.school)
        self.foreign = self.make_user('09120000101', role='consultant', school=self.other)
        self.math = Subject.objects.create(user=self.student, name='ریاضی', color_code='#10b981')
        self.physics = Subject.objects.create(user=self.student, name='فیزیک', color_code='#3b82f6')

        now = datetime.now(IRAN_TZ)
        today = now.replace(hour=10, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        self.seed_session(self.math, today, 3600)
        self.seed_session(self.physics, today, 1800)
        self.seed_session(self.math, yesterday, 2400)

    def make_user(
        self, phone: str, *, role: str = 'student', school=None,
        full_name: str = '', grade: str = '', olympiad: str = '',
    ) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=school,
            full_name=full_name, grade=grade, olympiad_field=olympiad,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def seed_session(self, subject: Subject, start: datetime, seconds: int) -> StudySession:
        return StudySession.objects.create(
            user=self.student,
            subject=subject,
            start_time=start,
            end_time=start + timedelta(seconds=seconds),
            duration_seconds=seconds,
            description='تست',
        )


class SharedReadModelTests(ProgressApiTests):
    def test_consultant_and_student_see_identical_progress(self):
        self.authenticate(self.student)
        student_view = self.client.get(PROGRESS_URL)
        self.assertEqual(student_view.status_code, 200, student_view.data)

        self.authenticate(self.consultant)
        consultant_view = self.client.get(f'{PROGRESS_URL}?user={self.student.id}')
        self.assertEqual(consultant_view.status_code, 200, consultant_view.data)
        self.assertEqual(consultant_view.data, student_view.data)

    def test_manager_profile_matches_planning_progress(self):
        self.authenticate(self.consultant)
        planning = self.client.get(f'{PROGRESS_URL}?user={self.student.id}')
        self.authenticate(self.manager)
        manager = self.client.get(MANAGER_PROFILE_URL.format(self.student.id))
        self.assertEqual(manager.status_code, 200, manager.data)
        self.assertEqual(manager.data, planning.data)

    def test_dashboard_stats_use_same_totals(self):
        self.authenticate(self.student)
        progress = self.client.get(PROGRESS_URL)
        stats = self.client.get(DASHBOARD_STATS_URL)
        self.assertEqual(stats.status_code, 200, stats.data)
        for key in ('today', 'week', 'month', 'total_sessions'):
            self.assertEqual(stats.data[key], progress.data[key], key)

    def test_totals_reflect_seeded_sessions(self):
        self.authenticate(self.student)
        data = self.client.get(PROGRESS_URL).data
        self.assertEqual(data['today'], 5400)
        self.assertEqual(data['week'], 7800)
        self.assertEqual(data['total_sessions'], 3)
        self.assertEqual(data['student_name'], 'علی')
        names = [row['name'] for row in data['subjects_breakdown']]
        self.assertEqual(names, ['ریاضی', 'فیزیک'])
        self.assertEqual(len(data['heatmap']), 90)
        self.assertIn(timezone.now().astimezone(IRAN_TZ).date().isoformat(), data['heatmap_data'])


class ProgressAccessTests(ProgressApiTests):
    def test_foreign_consultant_is_blocked(self):
        self.authenticate(self.foreign)
        response = self.client.get(f'{PROGRESS_URL}?user={self.student.id}')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error']['code'], 'SCHOOL_MISMATCH')

    def test_student_cannot_read_another_student(self):
        other = self.make_user('09120000099', school=self.school, full_name='سارا')
        self.authenticate(self.student)
        response = self.client.get(f'{PROGRESS_URL}?user={other.id}')
        self.assertEqual(response.status_code, 403)

    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get(PROGRESS_URL).status_code, 401)
