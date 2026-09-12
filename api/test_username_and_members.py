"""نام کاربری آزاد، تعیین رمز از پنل ادمین، و ویرایش اعضای مدرسه."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile


class UsernameAndMemberAdminTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='دبیرستان تست', invitation_code='TEST1234')
        self.admin_user = User.objects.create(username='09120000000')
        UserProfile.objects.create(
            user=self.admin_user,
            phone_number='09120000000',
            role='student',
            is_superadmin=True,
            is_password_set=True,
            is_profile_complete=True,
        )
        token = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_register_and_login_with_special_username(self):
        self.client.credentials()
        username = 'Admin.User_#1'
        check = self.client.post('/api/auth/check-phone/', {'phone_number': username}, format='json')
        self.assertEqual(check.status_code, 200)
        self.assertFalse(check.data['exists'])

        reg = self.client.post(
            '/api/auth/register/',
            {
                'phone_number': username,
                'password': 'Aa123456!',
                'password_confirm': 'Aa123456!',
            },
            format='json',
        )
        self.assertEqual(reg.status_code, 201, reg.data)
        self.assertEqual(reg.data['profile']['phone_number'], username)

        login = self.client.post(
            '/api/auth/login/',
            {'phone_number': username, 'password': 'Aa123456!'},
            format='json',
        )
        self.assertEqual(login.status_code, 200, login.data)

    def test_rejects_invalid_username(self):
        self.client.credentials()
        res = self.client.post('/api/auth/check-phone/', {'phone_number': 'کاربر'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_assign_manager_with_password(self):
        url = f'/api/superadmin/schools/{self.school.id}/assign-manager/'
        res = self.client.post(
            url,
            {
                'phone_number': 'School.Manager!',
                'password': 'MgrPass1',
                'full_name': 'مدیر تست',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['manager']['is_password_set'])
        profile = UserProfile.objects.get(phone_number='School.Manager!')
        self.assertEqual(profile.role, 'manager')
        self.assertEqual(profile.full_name, 'مدیر تست')
        self.assertTrue(profile.user.check_password('MgrPass1'))

        self.client.credentials()
        login = self.client.post(
            '/api/auth/login/',
            {'phone_number': 'School.Manager!', 'password': 'MgrPass1'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['profile']['role'], 'manager')

    def test_assign_consultant_with_password(self):
        url = f'/api/superadmin/schools/{self.school.id}/consultants/'
        res = self.client.post(
            url,
            {
                'phone_number': 'Consult@01',
                'password': 'ConPass1',
                'full_name': 'مشاور تست',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['consultant']['is_password_set'])
        profile = UserProfile.objects.get(phone_number='Consult@01')
        self.assertEqual(profile.role, 'consultant')
        self.assertTrue(profile.user.check_password('ConPass1'))

    def test_list_and_update_school_member(self):
        student = User.objects.create(username='student.one')
        profile = UserProfile.objects.create(
            user=student,
            phone_number='student.one',
            full_name='دانش‌آموز قبلی',
            role='student',
            school=self.school,
            is_password_set=True,
            is_profile_complete=True,
            grade='10',
        )
        student.set_password('OldPass1')
        student.save()

        listed = self.client.get(f'/api/superadmin/schools/{self.school.id}/members/')
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data['total_count'], 1)
        self.assertEqual(listed.data['members'][0]['phone_number'], 'student.one')
        self.assertEqual(listed.data['members'][0]['role'], 'student')

        updated = self.client.patch(
            f'/api/superadmin/schools/{self.school.id}/members/{student.id}/',
            {
                'phone_number': 'student.two!',
                'password': 'NewPass1',
                'full_name': 'دانش‌آموز جدید',
                'grade': '11',
                'olympiad_field': 'math',
            },
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        profile.refresh_from_db()
        student.refresh_from_db()
        self.assertEqual(profile.phone_number, 'student.two!')
        self.assertEqual(student.username, 'student.two!')
        self.assertEqual(profile.full_name, 'دانش‌آموز جدید')
        self.assertEqual(profile.grade, '11')
        self.assertTrue(student.check_password('NewPass1'))
