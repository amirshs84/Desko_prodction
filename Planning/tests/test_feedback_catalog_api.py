"""آزمون کاتالوگ درس، بازخورد پایان بلوک، و تقاضای تعدادی."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, StudySession, Subject, UserProfile

from Planning.models import (
    BlockFeedbackModel,
    CalendarEventModel,
    SubjectProfileModel,
)
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate

CATALOG_URL = '/api/planning/consultant/subjects/'
FEEDBACK_URL = '/api/planning/me/block-feedback/'
PREVIEW_URL = '/api/planning/consultant/plans/preview/'
DAY = '1404-05-03'


class PlanningExtrasApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF9999')
        self.consultant = self._user('09121110000', role='consultant')
        self.student = self._user('09121110001', full_name='علی')
        self.authenticate(self.consultant)

    def _user(self, phone: str, *, role: str = 'student', full_name: str = '') -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=self.school, full_name=full_name,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def _event(self, user: User, *, title: str = 'ریاضی') -> CalendarEventModel:
        day = JalaliDate(1404, 5, 3)
        return CalendarEventModel.objects.create(
            user=user,
            client_id=f'{user.id}-block',
            jy=day.jy, jm=day.jm, jd=day.jd,
            date=day.to_gregorian(),
            title=title,
            start_minutes=8 * 60,
            end_minutes=9 * 60 + 30,
            origin='algorithm',
        )


class SubjectCatalogApiTests(PlanningExtrasApiTests):
    def test_consultant_can_tag_a_subject(self):
        response = self.client.post(
            CATALOG_URL,
            {
                'name': 'ریاضی',
                'tags': ['specialized', 'analytical'],
                'default_priority': 5,
                'default_movability': 1,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['name'], 'ریاضی')
        self.assertIn('analytical', response.data['tags'])
        self.assertTrue(response.data['is_analytical'])
        self.assertEqual(SubjectProfileModel.objects.filter(school=self.school).count(), 1)

        listed = self.client.get(CATALOG_URL)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data['subjects']), 1)

    def test_student_cannot_write_catalog(self):
        self.authenticate(self.student)
        response = self.client.post(
            CATALOG_URL, {'name': 'فیزیک', 'tags': ['analytical']}, format='json',
        )
        self.assertEqual(response.status_code, 403)


class BlockFeedbackApiTests(PlanningExtrasApiTests):
    def test_student_rates_own_block(self):
        event = self._event(self.student)
        self.authenticate(self.student)
        response = self.client.post(
            FEEDBACK_URL,
            {'client_id': event.client_id, 'rating': 5, 'mood': 4},
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(response.data['mood'], 4)
        self.assertEqual(BlockFeedbackModel.objects.filter(user=self.student).count(), 1)

        again = self.client.post(
            FEEDBACK_URL,
            {'client_id': event.client_id, 'rating': 2, 'mood': 1},
            format='json',
        )
        self.assertEqual(again.status_code, 201)
        self.assertEqual(BlockFeedbackModel.objects.filter(user=self.student).count(), 1)
        self.assertEqual(BlockFeedbackModel.objects.get().rating, 2)

    def test_cannot_rate_someone_elses_block(self):
        event = self._event(self.consultant)
        self.authenticate(self.student)
        response = self.client.post(
            FEEDBACK_URL, {'client_id': event.client_id, 'rating': 5}, format='json',
        )
        self.assertEqual(response.status_code, 404)


class UnitDemandPreviewTests(PlanningExtrasApiTests):
    def test_count_demand_is_converted_to_minutes(self):
        math = Subject.objects.create(name='ریاضی', color_code='#111111', user=self.student)
        StudySession.objects.create(
            user=self.student,
            subject=math,
            start_time=datetime.now(timezone.utc) - timedelta(days=2),
            duration_seconds=60 * 60,
            mode=StudySession.MODE_TEST,
            count_test=40,
        )
        response = self.client.post(
            PREVIEW_URL,
            {
                'student_ids': [self.student.id],
                'start': DAY,
                'end': DAY,
                'intensity': 'normal',
                'demands': [{
                    'subject': 'ریاضی',
                    'amount': 100,
                    'unit': 'count',
                    'activity': 'test',
                    'priority': 5,
                    'movability': 2,
                }],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        student = response.data['students'][0]
        self.assertGreater(student['required_minutes'], 0)
        quota = student['quotas'][0]
        self.assertEqual(quota['subject'], 'ریاضی')
        self.assertEqual(quota['requested_units'], 100)
        self.assertGreater(quota['minutes'], 0)
        self.assertEqual(student['blocks'][0]['priority'], 5)
