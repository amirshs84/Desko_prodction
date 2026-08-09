"""آزمون پیام مستقیم و یادداشت خصوصی مشاور روی پروفایل دانش‌آموز."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

from Planning.models import ConsultantDirectMessageModel, ConsultantStudentNoteModel


class ConsultantProfileApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='PROF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='PROF5678')

        self.consultant = self._make_user('09121110100', role='consultant', school=self.school)
        self.peer = self._make_user('09121110101', role='consultant', school=self.school)
        self.ali = self._make_user('09121110201', school=self.school, full_name='علی احمدی', grade='11')
        self.outsider = self._make_user('09121110202', school=self.other_school, full_name='غریبه')

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

    def notes_url(self, user_id: int) -> str:
        return f'/api/planning/consultant/students/{user_id}/notes/'

    def messages_url(self, user_id: int) -> str:
        return f'/api/planning/consultant/students/{user_id}/messages/'

    def test_create_and_list_private_notes(self):
        response = self.client.post(
            self.notes_url(self.ali.id), {'body': 'تمرکز صبحگاهی ضعیف است.'}, format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['body'], 'تمرکز صبحگاهی ضعیف است.')
        self.assertEqual(ConsultantStudentNoteModel.objects.count(), 1)

        listed = self.client.get(self.notes_url(self.ali.id))
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        # مشاور دیگر همان مدرسه یادداشت را نمی‌بیند
        self.authenticate(self.peer)
        peer_list = self.client.get(self.notes_url(self.ali.id))
        self.assertEqual(peer_list.status_code, 200)
        self.assertEqual(peer_list.data, [])

    def test_note_rejects_other_school_student(self):
        response = self.client.post(
            self.notes_url(self.outsider.id), {'body': 'نباید ذخیره شود'}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ConsultantStudentNoteModel.objects.count(), 0)

    def test_update_and_delete_own_note(self):
        created = self.client.post(
            self.notes_url(self.ali.id), {'body': 'نسخه اول'}, format='json',
        ).data
        patched = self.client.patch(
            f'/api/planning/consultant/notes/{created["id"]}/',
            {'body': 'نسخه دوم'},
            format='json',
        )
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data['body'], 'نسخه دوم')

        deleted = self.client.delete(f'/api/planning/consultant/notes/{created["id"]}/')
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(ConsultantStudentNoteModel.objects.count(), 0)

    def test_direct_message_thread(self):
        sent = self.client.post(
            self.messages_url(self.ali.id), {'body': 'سلام، برنامه‌ات را دیدم.'}, format='json',
        )
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertEqual(sent.data['sender_role'], 'consultant')
        self.assertEqual(ConsultantDirectMessageModel.objects.count(), 1)

        thread = self.client.get(self.messages_url(self.ali.id))
        self.assertEqual(thread.status_code, 200)
        self.assertEqual(len(thread.data), 1)

        # دانش‌آموز پاسخ می‌دهد
        self.authenticate(self.ali)
        reply = self.client.post(
            '/api/planning/me/messages/',
            {'consultant_id': self.consultant.id, 'body': 'ممنون، اصلاح می‌کنم.'},
            format='json',
        )
        self.assertEqual(reply.status_code, 201, reply.data)
        self.assertEqual(reply.data['sender_role'], 'student')

        self.authenticate(self.consultant)
        thread = self.client.get(self.messages_url(self.ali.id))
        self.assertEqual(len(thread.data), 2)
        self.assertEqual(thread.data[1]['body'], 'ممنون، اصلاح می‌کنم.')
