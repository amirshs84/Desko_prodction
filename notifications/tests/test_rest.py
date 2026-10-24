"""آزمون REST: devices، events/batch (idempotency)، inbox، preferences."""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from notifications.container import set_container
from notifications.domain.enums import EventType, Platform
from notifications.infrastructure.persistence.models import (
    InteractionEventModel,
    NotificationModel,
)


@override_settings(
    NOTIF_DELIVERY_MODE="inline",
    FIREBASE_CREDENTIALS="",
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class NotifyRestTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        set_container(None)
        self.user = User.objects.create_user(username="09120000001", password="x")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def tearDown(self) -> None:
        set_container(None)
        cache.clear()

    def test_unauthenticated_is_rejected(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/notify/inbox/").status_code, 401)

    def test_register_device_returns_tracking_secret(self):
        resp = self.client.post(
            "/api/notify/devices/",
            {"platform": Platform.ANDROID.value, "token": "fcm-token-1", "app_version": "1.0"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertIn("tracking_secret", resp.data)
        self.assertEqual(resp.data["platform"], "ANDROID")
        # ثبت دوباره همان توکن secret را عوض نمی‌کند مگر کاربر عوض شود
        again = self.client.post(
            "/api/notify/devices/",
            {"platform": "ANDROID", "token": "fcm-token-1"},
            format="json",
        )
        self.assertEqual(again.status_code, 201)
        self.assertEqual(again.data["device_id"], resp.data["device_id"])

    def test_preferences_get_and_opt_out(self):
        listed = self.client.get("/api/notify/preferences/")
        self.assertEqual(listed.status_code, 200)
        keys = {c["key"] for c in listed.data["categories"]}
        self.assertIn("direct_message", keys)
        self.assertIn("exam", keys)

        updated = self.client.put(
            "/api/notify/preferences/",
            {
                "toggles": [{"category": "tips", "channel": "PUSH", "enabled": False}],
                "quiet_hours": "22:00-06:00",
                "quiet_hours_enabled": True,
            },
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        tips = next(c for c in updated.data["categories"] if c["key"] == "tips")
        self.assertFalse(tips["channels"]["PUSH"])
        self.assertEqual(updated.data["quiet_hours"], "22:00-06:00")

        forbidden = self.client.put(
            "/api/notify/preferences/",
            {"toggles": [{"category": "exam", "channel": "PUSH", "enabled": False}]},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 400)

    def test_inbox_and_mark_read(self):
        from notifications.api import Notifier

        result = Notifier.notify(
            recipients=[self.user.id],
            category="exam",
            template="exam_session_started",
            context={"exam_title": "فیزیک"},
            deeplink="/exams/1/take",
        )
        self.assertEqual(len(result.created), 1)
        from notifications.container import get_container

        get_container().dispatch_service.dispatch(result.created[0])
        inbox = self.client.get("/api/notify/inbox/")
        self.assertEqual(inbox.status_code, 200)
        self.assertGreaterEqual(len(inbox.data["items"]), 1)
        self.assertGreaterEqual(inbox.data["unread_count"], 1)

        marked = self.client.post(
            "/api/notify/inbox/read/",
            {"ids": [str(result.created[0])]},
            format="json",
        )
        self.assertEqual(marked.status_code, 200)
        count = self.client.get("/api/notify/inbox/unread-count/")
        self.assertEqual(count.data["unread_count"], marked.data["unread_count"])

    def test_events_batch_idempotent_and_device_secret_auth(self):
        from notifications.api import Notifier

        created = Notifier.notify(
            recipients=[self.user.id],
            category="system",
            title="ورود جدید",
            body="اگر شما نبودید، رمز را عوض کنید.",
        ).created[0]
        device = self.client.post(
            "/api/notify/devices/",
            {"platform": "WEB", "token": "web-token-1"},
            format="json",
        ).data
        event_id = str(uuid.uuid4())
        payload = {
            "events": [
                {
                    "id": event_id,
                    "type": EventType.OPENED.value,
                    "occurred_at": timezone.now().isoformat(),
                    "notification_id": str(created),
                }
            ]
        }
        first = self.client.post("/api/notify/events/batch/", payload, format="json")
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(first.data["accepted"], 1)

        self.client.credentials()
        second = self.client.post(
            "/api/notify/events/batch/",
            payload,
            format="json",
            HTTP_X_DEVICE_ID=device["device_id"],
            HTTP_X_DEVICE_SECRET=device["tracking_secret"],
        )
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(second.data["duplicates"], 1)
        self.assertEqual(InteractionEventModel.objects.filter(client_event_id=event_id).count(), 1)
        self.assertIsNotNone(NotificationModel.objects.get(id=created).read_at)

    def test_notify_idempotency_key(self):
        from notifications.api import Notifier

        first = Notifier.notify(
            recipients=[self.user.id],
            category="exam",
            template="exam_session_started",
            context={"exam_title": "فیزیک"},
            deeplink="/exams/1/take",
            idempotency_key="exam-start:1:user",
        )
        second = Notifier.notify(
            recipients=[self.user.id],
            category="exam",
            template="exam_session_started",
            context={"exam_title": "فیزیک"},
            deeplink="/exams/1/take",
            idempotency_key="exam-start:1:user",
        )
        self.assertEqual(len(first.created), 1)
        self.assertEqual(len(second.created), 0)
        self.assertEqual(second.duplicates, first.created)

    def test_local_schedule_sync(self):
        from notifications.api import Notifier

        fire_at = timezone.now() + timedelta(hours=2)
        Notifier.schedule_local(
            user_id=self.user.id,
            source_key="planning_block:evt-1",
            category="study_reminder",
            fire_at=fire_at,
            template="study_block_reminder",
            context={"subject": "ریاضی", "start_time": "16:00"},
            deeplink="/calendar",
        )
        resp = self.client.get("/api/notify/local-schedule/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["items"]), 1)
        self.assertEqual(resp.data["items"][0]["source_key"], "planning_block:evt-1")
        self.assertIn("server_time", resp.data)
