"""یکپارچه‌سازی نمونه: پیام مشاور، شروع آزمون، یادآور بلوک مطالعه."""
from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile
from Exam.notify import notify_exam_session_started
from notifications.container import set_container
from notifications.domain.enums import Priority
from notifications.infrastructure.persistence.models import (
    LocalReminderModel,
    NotificationModel,
)
from Planning.scheduling.application.services.study_reminder import (
    SOURCE_PREFIX,
    event_start,
    source_key_for,
    sync_study_reminder,
)
from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.enums import EventKind
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.shared.domain.enums import WriteAuthority


@override_settings(
    NOTIF_DELIVERY_MODE="inline",
    FIREBASE_CREDENTIALS="",
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class DirectMessageNotifyTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        set_container(None)
        self.school = School.objects.create(name="مدرسه تست", invitation_code="NOTIFDM1")
        self.consultant = self._user("09121110001", role="consultant", full_name="سارا مشاور")
        self.student = self._user("09121110002", role="student", full_name="علی")
        token = RefreshToken.for_user(self.consultant)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def tearDown(self) -> None:
        set_container(None)

    def _user(self, phone: str, *, role: str, full_name: str) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=self.school, full_name=full_name
        )
        return user

    def test_consultant_message_creates_high_notification(self):
        resp = self.client.post(
            f"/api/planning/consultant/students/{self.student.id}/messages/",
            {"body": "سلام، برنامه‌ات را دیدم."},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        row = NotificationModel.objects.get(recipient=self.student, category_id="direct_message")
        self.assertEqual(row.priority, Priority.HIGH.value)
        self.assertIn("سارا مشاور", row.content["title"])
        self.assertEqual(row.content["actions"][0]["title"], "مشاهده")
        self.assertEqual(row.content["actions"][1]["title"], "بعداً")
        self.assertEqual(row.deeplink, "/notifications")


class ExamNotifyTests(SimpleTestCase):
    def test_assigns_critical_and_schedules_future_start(self):
        start = timezone.now() + timedelta(hours=2)
        session = SimpleNamespace(
            id=42,
            title="جلسه‌ی فیزیک",
            start_time=start,
            end_time=start + timedelta(hours=1),
            exam=SimpleNamespace(title="فیزیک نهایی"),
        )
        with patch("notifications.api.Notifier.notify_safely") as send:
            notify_exam_session_started(session, [7, 7, 8])
        self.assertEqual(send.call_count, 2)
        first = send.call_args_list[0].kwargs
        self.assertEqual(first["category"], "exam")
        self.assertEqual(first["template"], "exam_session_started")
        self.assertEqual(first["priority"], Priority.CRITICAL)
        self.assertEqual(first["deeplink"], "/exams/42/take")
        self.assertEqual(first["scheduled_at"], start)
        self.assertEqual(first["idempotency_key"], "exam-start:42:7")
        self.assertEqual(send.call_args_list[1].kwargs["recipients"], [8])


@override_settings(
    NOTIF_DELIVERY_MODE="inline",
    FIREBASE_CREDENTIALS="",
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class StudyReminderTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        set_container(None)
        self.user = User.objects.create_user(username="09121110009", password="x")

    def tearDown(self) -> None:
        set_container(None)

    def _event(self, *, all_day: bool = False, immutable: bool = False) -> CalendarEvent:
        day = JalaliDate.from_gregorian((timezone.now() + timedelta(days=2)).date())
        return CalendarEvent.create(
            ref=EventRef(owner_id=self.user.id, client_id="block-42"),
            date=day,
            slot=TimeRange.from_clock("16:00", "17:30"),
            title="ریاضی",
            authority=WriteAuthority.SCHOOL_MANAGER if immutable else WriteAuthority.STUDENT,
            kind=EventKind.IMMUTABLE if immutable else EventKind.MUTABLE,
            all_day=all_day,
        )

    def test_schedules_five_minutes_before_start(self):
        event = self._event()
        sync_study_reminder(event)
        row = LocalReminderModel.objects.get(user=self.user, source_key=source_key_for(event))
        self.assertEqual(row.category_key, "study_reminder")
        self.assertFalse(row.cancelled)
        self.assertEqual(row.fire_at, event_start(event) - timedelta(minutes=5))
        self.assertIn("ریاضی", row.content["title"])
        self.assertEqual(row.deeplink, "/calendar")

    def test_skips_all_day_and_immutable(self):
        sync_study_reminder(self._event(all_day=True))
        sync_study_reminder(self._event(immutable=True))
        self.assertFalse(
            LocalReminderModel.objects.filter(
                user=self.user, source_key=f"{SOURCE_PREFIX}block-42", cancelled=False
            ).exists()
        )
