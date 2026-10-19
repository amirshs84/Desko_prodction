"""بسته دموی فروش: پر شدن پنل‌ها، جایگزینی امن، و تیک دانش‌آموز تکی."""
from datetime import timedelta

from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from Planning.scheduling.infrastructure.persistence.models import CalendarEventModel
from api.demo_seed import DEMO_PASSWORD, consultant_username, student_username
from api.jalali_utils import iran_today, make_iran_day_start
from api.models import ConsultantTicket, School, SchoolClass, StudySession, Subject, UserProfile

SEED_URL = '/api/superadmin/schools/{school_id}/seed-demo/'
STUDENT_URL = '/api/superadmin/schools/{school_id}/students/'


class DemoSeedTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='دبیرستان فروش', invitation_code='DEMOSELL')
        self.admin_user = User.objects.create(username='09120000099')
        UserProfile.objects.create(
            user=self.admin_user,
            phone_number='09120000099',
            role='student',
            is_superadmin=True,
            is_password_set=True,
            is_profile_complete=True,
        )
        token = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def _seed(self):
        return self.client.post(SEED_URL.format(school_id=self.school.id), format='json')

    def _week_buckets(self):
        today_start = make_iran_day_start(iran_today())
        week_start = today_start - timedelta(days=7)
        rows = (
            StudySession.objects.filter(
                user__profile__school=self.school,
                user__profile__role='student',
                start_time__gte=week_start,
            )
            .values('user_id')
            .annotate(week_total=Sum('duration_seconds'))
        )
        week_map = {row['user_id']: row['week_total'] or 0 for row in rows}
        threshold = (self.school.normal_study_threshold or 21600) * 3
        buckets = {'excellent': 0, 'good': 0, 'average': 0, 'needs': 0}
        students = UserProfile.objects.filter(school=self.school, role='student')
        for student in students:
            total = week_map.get(student.user_id, 0)
            if total >= threshold * 1.5:
                buckets['excellent'] += 1
            elif total >= threshold:
                buckets['good'] += 1
            elif total >= threshold * 0.5:
                buckets['average'] += 1
            else:
                buckets['needs'] += 1
        return buckets

    def test_seed_fills_school_and_password_works(self):
        response = self._seed()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['password'], DEMO_PASSWORD)
        self.assertTrue(response.data['manager']['created'])
        self.assertEqual(len(response.data['students']), 10)

        self.school.refresh_from_db()
        self.assertTrue(self.school.is_demo)

        manager = User.objects.get(username=response.data['manager']['username'])
        consultant = User.objects.get(username=consultant_username(self.school.id))
        self.assertTrue(check_password(DEMO_PASSWORD, manager.password))
        self.assertTrue(check_password(DEMO_PASSWORD, consultant.password))
        self.assertEqual(manager.profile.role, 'manager')
        self.assertEqual(consultant.profile.role, 'consultant')

        students = UserProfile.objects.filter(school=self.school, role='student', is_demo=True)
        self.assertEqual(students.count(), 10)
        self.assertEqual(SchoolClass.objects.get(school=self.school, is_demo=True).enrollments.count(), 10)
        self.assertEqual(self._week_buckets(), {
            'excellent': 2,
            'good': 3,
            'average': 3,
            'needs': 2,
        })

        showcase = students.get(phone_number=student_username(self.school.id, 1))
        self.assertGreater(StudySession.objects.filter(user=showcase.user).count(), 20)
        self.assertEqual(Subject.objects.filter(user=showcase.user).count(), 5)
        self.assertGreater(CalendarEventModel.objects.filter(user=showcase.user).count(), 10)
        self.assertTrue(showcase.is_studying)
        self.assertEqual(ConsultantTicket.objects.filter(user__profile__school=self.school).count(), 3)
        self.assertEqual(
            ConsultantTicket.objects.filter(user__profile__school=self.school, reply__isnull=False).count(),
            1,
        )

        today_start = make_iran_day_start(iran_today())
        self.assertTrue(
            StudySession.objects.filter(
                user__profile__school=self.school,
                start_time__gte=today_start,
            ).exists()
        )

    def test_reseed_replaces_demo_cast_only(self):
        real_manager = User.objects.create(username='real-manager')
        UserProfile.objects.create(
            user=real_manager,
            phone_number='real-manager',
            full_name='مدیر واقعی',
            role='manager',
            school=self.school,
            is_password_set=True,
            is_profile_complete=True,
        )
        real_student = User.objects.create(username='real-student')
        real_profile = UserProfile.objects.create(
            user=real_student,
            phone_number='real-student',
            full_name='دانش‌آموز واقعی',
            role='student',
            school=self.school,
            is_password_set=True,
            is_profile_complete=True,
        )
        subject = Subject.objects.create(user=real_student, name='عربی', color_code='#111111')
        StudySession.objects.create(
            user=real_student,
            subject=subject,
            start_time=timezone.now(),
            duration_seconds=600,
        )

        first = self._seed()
        self.assertEqual(first.status_code, 201, first.data)
        self.assertFalse(first.data['manager']['created'])
        self.assertEqual(first.data['manager']['username'], 'real-manager')
        first_ids = set(
            UserProfile.objects.filter(school=self.school, role='student', is_demo=True)
            .values_list('user_id', flat=True)
        )

        second = self._seed()
        self.assertEqual(second.status_code, 201, second.data)
        second_ids = set(
            UserProfile.objects.filter(school=self.school, role='student', is_demo=True)
            .values_list('user_id', flat=True)
        )
        self.assertEqual(len(second_ids), 10)
        self.assertTrue(first_ids.isdisjoint(second_ids))
        self.assertEqual(UserProfile.objects.filter(school=self.school, role='manager').count(), 1)

        real_manager.profile.refresh_from_db()
        self.assertEqual(real_manager.profile.role, 'manager')
        self.assertFalse(real_manager.profile.is_demo)
        self.assertTrue(UserProfile.objects.filter(pk=real_profile.pk).exists())
        self.assertEqual(StudySession.objects.filter(user=real_student).count(), 1)
        self.assertEqual(SchoolClass.objects.filter(school=self.school, is_demo=True).count(), 1)

    def test_rejects_username_owned_by_someone_else(self):
        taken = consultant_username(self.school.id)
        User.objects.create(username=taken)
        UserProfile.objects.create(
            user=User.objects.get(username=taken),
            phone_number=taken,
            role='student',
            is_profile_complete=True,
        )
        response = self._seed()
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(UserProfile.objects.filter(school=self.school, role='consultant').exists())
        self.assertTrue(User.objects.filter(username=taken).exists())

    def test_manual_student_checkbox_fills_activity_and_survives_reseed(self):
        created = self.client.post(
            STUDENT_URL.format(school_id=self.school.id),
            {
                'phone_number': 'demo.student',
                'password': 'secret1',
                'full_name': 'دانش‌آموز تکی',
                'grade': '11',
                'seed_demo': True,
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertTrue(created.data['demo_seeded'])
        profile = UserProfile.objects.get(phone_number='demo.student')
        self.assertTrue(profile.is_demo)
        self.assertGreater(StudySession.objects.filter(user=profile.user).count(), 10)
        self.assertGreater(CalendarEventModel.objects.filter(user=profile.user).count(), 5)

        seeded = self._seed()
        self.assertEqual(seeded.status_code, 201, seeded.data)
        self.assertTrue(UserProfile.objects.filter(phone_number='demo.student').exists())
        self.assertEqual(
            UserProfile.objects.filter(school=self.school, role='student').count(),
            11,
        )

    def test_seed_requires_superadmin(self):
        self.client.credentials()
        response = self._seed()
        self.assertEqual(response.status_code, 401)
