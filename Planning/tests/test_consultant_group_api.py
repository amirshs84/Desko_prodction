"""آزمون انتها‌به‌انتهای پنل گروه‌بندی مشاور.

سنجه‌های اصلی: ایزولاسیون بین مشاوران، محدود بودن اعضا به دانش‌آموزان همان مدرسه،
عضویت یک دانش‌آموز در چند گروه، و بسته بودن این اندپوینت‌ها برای دانش‌آموز و مدیر.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import ClassEnrollment, School, SchoolClass, UserProfile

from Planning.models import StudentGroupMemberModel, StudentGroupModel

GROUPS_URL = '/api/planning/consultant/groups/'
ROSTER_URL = '/api/planning/consultant/students/'


class ConsultantGroupApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')

        self.consultant = self._make_user('09120000100', role='consultant', school=self.school)
        self.peer = self._make_user('09120000101', role='consultant', school=self.school)
        self.manager = self._make_user('09120000102', role='manager', school=self.school)

        self.ali = self._make_user('09120000201', school=self.school, full_name='علی احمدی', grade='11')
        self.sara = self._make_user('09120000202', school=self.school, full_name='سارا کریمی', grade='12')
        self.outsider = self._make_user('09120000203', school=self.other_school, full_name='مهدی غریبه')

        self.school_class = SchoolClass.objects.create(
            school=self.school, code='11A', name='یازدهم ریاضی', grade='11',
        )
        ClassEnrollment.objects.create(school_class=self.school_class, student=self.ali.profile)

        self.authenticate(self.consultant)

    def _make_user(
        self, phone: str, *, role: str = 'student', school: School | None = None,
        full_name: str = '', grade: str = '',
    ) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=school,
            full_name=full_name, grade=grade,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def create_group(self, **payload):
        body = {'name': 'گروه آزمون', **payload}
        response = self.client.post(GROUPS_URL, body, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data


class GroupCrudTests(ConsultantGroupApiTests):
    def test_create_group_with_members(self):
        group = self.create_group(
            name='کنکوری‌های ریاضی',
            description='گروه فشرده',
            member_ids=[self.ali.id, self.sara.id],
        )
        self.assertEqual(group['name'], 'کنکوری‌های ریاضی')
        self.assertEqual(group['member_count'], 2)
        self.assertEqual(
            [member['full_name'] for member in group['members']], ['سارا کریمی', 'علی احمدی'],
        )
        self.assertEqual(group['members'][1]['class_names'], ['یازدهم ریاضی'])
        self.assertEqual(StudentGroupModel.objects.count(), 1)
        self.assertEqual(StudentGroupMemberModel.objects.count(), 2)

    def test_duplicate_name_for_same_consultant_conflicts(self):
        self.create_group(name='گروه الف')
        response = self.client.post(GROUPS_URL, {'name': 'گروه الف'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'CONFLICT')

    def test_rename_to_existing_name_conflicts(self):
        self.create_group(name='گروه الف')
        second = self.create_group(name='گروه ب')
        response = self.client.patch(
            f'{GROUPS_URL}{second["id"]}/', {'name': 'گروه الف'}, format='json',
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'CONFLICT')

    def test_same_name_allowed_for_different_consultants(self):
        self.create_group(name='گروه الف')
        self.authenticate(self.peer)
        self.create_group(name='گروه الف')
        self.assertEqual(StudentGroupModel.objects.count(), 2)

    def test_rename_and_describe(self):
        group = self.create_group(name='گروه اول')
        response = self.client.patch(
            f'{GROUPS_URL}{group["id"]}/', {'name': 'گروه دوم', 'description': 'شرح'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['name'], 'گروه دوم')
        self.assertEqual(response.data['description'], 'شرح')

    def test_empty_patch_is_rejected(self):
        group = self.create_group()
        response = self.client.patch(f'{GROUPS_URL}{group["id"]}/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')

    def test_delete_group_removes_memberships_only(self):
        group = self.create_group(member_ids=[self.ali.id])
        response = self.client.delete(f'{GROUPS_URL}{group["id"]}/')
        self.assertEqual(response.status_code, 204)
        self.assertEqual(StudentGroupMemberModel.objects.count(), 0)
        self.assertTrue(User.objects.filter(id=self.ali.id).exists())

    def test_list_only_returns_own_groups(self):
        self.create_group(name='گروه من')
        self.authenticate(self.peer)
        self.create_group(name='گروه همکار')

        response = self.client.get(GROUPS_URL)
        self.assertEqual([item['name'] for item in response.data], ['گروه همکار'])

    def test_other_consultant_group_is_invisible(self):
        group = self.create_group(name='گروه من')
        self.authenticate(self.peer)
        for method, kwargs in (
            ('get', {}),
            ('patch', {'data': {'name': 'x'}, 'format': 'json'}),
            ('delete', {}),
        ):
            with self.subTest(method=method):
                response = getattr(self.client, method)(f'{GROUPS_URL}{group["id"]}/', **kwargs)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.data['error']['code'], 'NOT_FOUND')


class GroupMembershipTests(ConsultantGroupApiTests):
    def members_url(self, group_id: int) -> str:
        return f'{GROUPS_URL}{group_id}/members/'

    def test_add_then_remove_members(self):
        group = self.create_group()
        added = self.client.post(
            self.members_url(group['id']),
            {'add': [self.ali.id, self.sara.id]},
            format='json',
        )
        self.assertEqual(added.status_code, 200, added.data)
        self.assertEqual(added.data['member_count'], 2)

        removed = self.client.post(
            self.members_url(group['id']), {'remove': [self.ali.id]}, format='json',
        )
        self.assertEqual(removed.data['member_count'], 1)
        self.assertEqual(removed.data['members'][0]['user_id'], self.sara.id)

    def test_replace_members(self):
        group = self.create_group(member_ids=[self.ali.id])
        response = self.client.post(
            self.members_url(group['id']), {'member_ids': [self.sara.id]}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([m['user_id'] for m in response.data['members']], [self.sara.id])

    def test_replace_cannot_be_combined_with_diff(self):
        group = self.create_group()
        response = self.client.post(
            self.members_url(group['id']),
            {'member_ids': [self.ali.id], 'add': [self.sara.id]},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_student_of_another_school_is_rejected(self):
        group = self.create_group()
        response = self.client.post(
            self.members_url(group['id']), {'add': [self.outsider.id]}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(response.data['error']['meta']['invalid_user_ids'], [self.outsider.id])
        self.assertEqual(StudentGroupMemberModel.objects.count(), 0)

    def test_non_student_cannot_be_a_member(self):
        group = self.create_group()
        response = self.client.post(
            self.members_url(group['id']), {'add': [self.manager.id]}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_adding_same_member_twice_is_harmless(self):
        group = self.create_group(member_ids=[self.ali.id])
        response = self.client.post(
            self.members_url(group['id']), {'add': [self.ali.id]}, format='json',
        )
        self.assertEqual(response.data['member_count'], 1)
        self.assertEqual(StudentGroupMemberModel.objects.count(), 1)

    def test_student_can_belong_to_several_groups(self):
        first = self.create_group(name='گروه یک', member_ids=[self.ali.id])
        second = self.create_group(name='گروه دو', member_ids=[self.ali.id])
        self.assertEqual(
            StudentGroupMemberModel.objects.filter(student=self.ali).count(), 2,
        )
        self.assertNotEqual(first['id'], second['id'])


def _roster_students(response_data):
    """پاسخ غنی Roster یا آرایه‌ی تخت (flat)."""
    if isinstance(response_data, list):
        return response_data
    return response_data['students']


class RosterTests(ConsultantGroupApiTests):
    def test_lists_school_students_with_group_annotation(self):
        group = self.create_group(name='گروه یک', member_ids=[self.ali.id])
        response = self.client.get(ROSTER_URL)
        self.assertEqual(response.status_code, 200)
        self.assertIn('columns', response.data)
        self.assertEqual(response.data['period'], 'weekly')

        by_id = {entry['user_id']: entry for entry in _roster_students(response.data)}
        self.assertEqual(set(by_id), {self.ali.id, self.sara.id})
        self.assertEqual(by_id[self.ali.id]['groups'], [{'id': group['id'], 'name': 'گروه یک'}])
        self.assertEqual(by_id[self.sara.id]['groups'], [])
        self.assertEqual(by_id[self.ali.id]['class_names'], ['یازدهم ریاضی'])
        self.assertIn('study_seconds', by_id[self.ali.id])
        self.assertIn('performance', by_id[self.ali.id])
        self.assertIn('#کنکوری', by_id[self.ali.id]['tags'])

    def test_other_consultant_groups_are_not_annotated(self):
        self.create_group(name='گروه من', member_ids=[self.ali.id])
        self.authenticate(self.peer)
        response = self.client.get(ROSTER_URL)
        self.assertTrue(
            all(entry['groups'] == [] for entry in _roster_students(response.data)),
        )

    def test_filters(self):
        by_grade = self.client.get(f'{ROSTER_URL}?grade=12')
        self.assertEqual(
            [e['user_id'] for e in _roster_students(by_grade.data)], [self.sara.id],
        )

        by_search = self.client.get(f'{ROSTER_URL}?search=علی')
        self.assertEqual(
            [e['user_id'] for e in _roster_students(by_search.data)], [self.ali.id],
        )

        by_phone = self.client.get(f'{ROSTER_URL}?search=09120000202')
        self.assertEqual(
            [e['user_id'] for e in _roster_students(by_phone.data)], [self.sara.id],
        )

        by_class = self.client.get(f'{ROSTER_URL}?class_id={self.school_class.id}')
        self.assertEqual(
            [e['user_id'] for e in _roster_students(by_class.data)], [self.ali.id],
        )

        by_tag = self.client.get(f'{ROSTER_URL}?tag=کنکوری')
        self.assertEqual(by_tag.status_code, 200)
        tagged_ids = {e['user_id'] for e in _roster_students(by_tag.data)}
        self.assertEqual(tagged_ids, {self.ali.id, self.sara.id})

    def test_students_of_other_schools_are_never_listed(self):
        response = self.client.get(ROSTER_URL)
        self.assertNotIn(
            self.outsider.id,
            [entry['user_id'] for entry in _roster_students(response.data)],
        )

    def test_flat_flag_returns_array(self):
        response = self.client.get(f'{ROSTER_URL}?flat=1')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)


class ConsultantOnlyAccessTests(ConsultantGroupApiTests):
    def test_student_and_manager_are_forbidden(self):
        for user in (self.ali, self.manager):
            with self.subTest(user=user.username):
                self.authenticate(user)
                self.assertEqual(self.client.get(GROUPS_URL).status_code, 403)
                self.assertEqual(self.client.get(ROSTER_URL).status_code, 403)

    def test_unauthenticated_is_rejected(self):
        self.client.credentials()
        self.assertEqual(self.client.get(GROUPS_URL).status_code, 401)

    def test_consultant_without_school_is_rejected(self):
        homeless = self._make_user('09120000900', role='consultant', school=None)
        self.authenticate(homeless)
        response = self.client.get(GROUPS_URL)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error']['code'], 'FORBIDDEN')
