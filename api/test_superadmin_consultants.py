"""آزمون تعیین/لغو مشاور مدرسه توسط سوپرادمین و ورود اول (تعیین رمز)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

CONSULTANTS_URL = '/api/superadmin/schools/{school_id}/consultants/'
CHECK_PHONE_URL = '/api/auth/check-phone/'
REGISTER_URL = '/api/auth/register/'


class SuperAdminConsultantsTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='دبیرستان تست', invitation_code='TEST1234')
        self.admin_user = User.objects.create(username='09120000000')
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user,
            phone_number='09120000000',
            role='student',
            is_superadmin=True,
            is_password_set=True,
            is_profile_complete=True,
        )
        token = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_assign_list_and_revoke_consultant(self):
        url = CONSULTANTS_URL.format(school_id=self.school.id)
        phone = '09121112233'

        create = self.client.post(
            url,
            {'phone_number': phone, 'password': 'Aa123456!', 'full_name': 'مشاور یک'},
            format='json',
        )
        self.assertEqual(create.status_code, 201, create.data)

        listed = self.client.get(url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]['phone_number'], phone)
        self.assertTrue(listed.data[0]['is_password_set'])

        profile = UserProfile.objects.get(phone_number=phone)
        self.assertEqual(profile.role, 'consultant')
        self.assertEqual(profile.school_id, self.school.id)
        self.assertTrue(profile.is_profile_complete)

        revoked = self.client.delete(url, {'phone_number': phone}, format='json')
        self.assertEqual(revoked.status_code, 200, revoked.data)
        profile.refresh_from_db()
        self.assertEqual(profile.role, 'student')
        self.assertEqual(self.client.get(url).data, [])

    def test_cannot_assign_manager_as_consultant(self):
        manager = User.objects.create(username='09123334455')
        UserProfile.objects.create(
            user=manager,
            phone_number='09123334455',
            role='manager',
            school=self.school,
            is_profile_complete=True,
        )
        url = CONSULTANTS_URL.format(school_id=self.school.id)
        response = self.client.post(url, {'phone_number': '09123334455'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_first_login_sets_password_and_returns_consultant_role(self):
        url = CONSULTANTS_URL.format(school_id=self.school.id)
        phone = '09125556677'
        self.client.post(url, {'phone_number': phone}, format='json')
        self.client.credentials()  # anonymous

        check = self.client.post(CHECK_PHONE_URL, {'phone_number': phone}, format='json')
        self.assertTrue(check.data['exists'])
        self.assertFalse(check.data['has_password'])

        reg = self.client.post(
            REGISTER_URL,
            {
                'phone_number': phone,
                'password': 'Aa123456!',
                'password_confirm': 'Aa123456!',
            },
            format='json',
        )
        self.assertEqual(reg.status_code, 200, reg.data)
        self.assertEqual(reg.data['profile']['role'], 'consultant')
        self.assertTrue(reg.data['profile']['is_profile_complete'])

        profile = UserProfile.objects.get(phone_number=phone)
        self.assertTrue(profile.is_password_set)
