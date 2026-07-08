"""آزمون یکپارچه‌ی لایه‌ی REST اپ AI.

جریان کامل از مرز HTTP: احراز هویت JWT → ساخت مکالمه → ارسال پیام → فهرست →
اکشن‌ها → آپلود پیوست. با APIClient واقعی و DB تست (SQLite) اجرا می‌شود تا
اتصال view↔container↔repository را انتها‌به‌انتها بسنجد.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from Ai.infrastructure.persistence.models import AIModelModel
from Ai.shared.infrastructure.ids import uuid7


class AiRestApiTests(APITestCase):
    def setUp(self) -> None:
        from django.core.cache import cache

        cache.clear()  # جلوگیری از نشت کش بین تست‌ها (LocMem بین متدها پایدار است)
        self.user = User.objects.create(username="09120000000", password="x")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        self.model = AIModelModel.objects.create(
            id=uuid7(),
            provider_key="fake",
            key="fake-1",
            display_name="Fake Model",
            context_window=8000,
            max_output_tokens=1024,
            capabilities=["chat"],
            is_active=True,
        )

    def _create_conversation(self) -> dict:
        resp = self.client.post(
            "/api/ai/conversations/",
            {"model_id": str(self.model.id), "title": "گفتگوی تست"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        return resp.data

    def test_unauthenticated_is_rejected(self):
        self.client.credentials()  # حذف توکن
        resp = self.client.get("/api/ai/conversations/")
        self.assertEqual(resp.status_code, 401)

    def test_create_and_list_conversation(self):
        conv = self._create_conversation()
        self.assertEqual(conv["title"], "گفتگوی تست")
        self.assertEqual(conv["version"], 1)

        resp = self.client.get("/api/ai/conversations/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["items"]), 1)
        self.assertIn("page", resp.data)

    def test_rename_optimistic_conflict(self):
        conv = self._create_conversation()
        cid = conv["id"]

        ok = self.client.patch(
            f"/api/ai/conversations/{cid}/",
            {"title": "نام جدید", "expected_version": 1},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data["title"], "نام جدید")
        self.assertEqual(ok.data["version"], 2)

        # نسخه‌ی کهنه → تعارض قفل خوش‌بینانه.
        stale = self.client.patch(
            f"/api/ai/conversations/{cid}/",
            {"title": "دوباره", "expected_version": 1},
            format="json",
        )
        self.assertEqual(stale.status_code, 409, stale.data)
        self.assertEqual(stale.data["error"]["code"], "CONCURRENCY_CONFLICT")

    def test_pin_and_change_model_actions(self):
        conv = self._create_conversation()
        cid = conv["id"]

        pin = self.client.post(
            f"/api/ai/conversations/{cid}/actions/pin/",
            {"expected_version": 1},
            format="json",
        )
        self.assertEqual(pin.status_code, 200, pin.data)
        self.assertTrue(pin.data["is_pinned"])

        other = AIModelModel.objects.create(
            id=uuid7(),
            provider_key="fake",
            key="fake-2",
            display_name="Fake 2",
            context_window=8000,
            max_output_tokens=1024,
            capabilities=["chat"],
            is_active=True,
        )
        cm = self.client.post(
            f"/api/ai/conversations/{cid}/actions/change-model/",
            {"model_id": str(other.id), "expected_version": 2},
            format="json",
        )
        self.assertEqual(cm.status_code, 200, cm.data)
        self.assertEqual(cm.data["model_id"], str(other.id))

    def test_send_and_list_messages(self):
        conv = self._create_conversation()
        cid = conv["id"]

        send = self.client.post(
            f"/api/ai/conversations/{cid}/messages/send/",
            {"content": "سلام"},
            format="json",
        )
        self.assertEqual(send.status_code, 202, send.data)
        self.assertEqual(send.data["user_message"]["content"], "سلام")
        self.assertEqual(send.data["assistant_message"]["status"], "pending")

        lst = self.client.get(f"/api/ai/conversations/{cid}/messages/")
        self.assertEqual(lst.status_code, 200)
        self.assertEqual(len(lst.data["items"]), 2)

    def test_not_found_conversation(self):
        missing = uuid7()
        resp = self.client.get(f"/api/ai/conversations/{missing}/")
        self.assertEqual(resp.status_code, 404, resp.data)
        self.assertEqual(resp.data["error"]["code"], "NOT_FOUND")

    def test_upload_attachment(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(
            "note.txt", b"hello world", content_type="text/plain"
        )
        resp = self.client.post(
            "/api/ai/attachments/", {"file": upload}, format="multipart"
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data["file_type"], "txt")
        self.assertEqual(resp.data["size_bytes"], 11)

    def test_validation_error_envelope(self):
        # model_id غایب → خطای اعتبارسنجی با پاکت یکنواخت.
        resp = self.client.post("/api/ai/conversations/", {}, format="json")
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn("error", resp.data)

    # ---------- استریم (SSE) ----------

    def _send_and_get_assistant_id(self) -> str:
        conv = self._create_conversation()
        send = self.client.post(
            f"/api/ai/conversations/{conv['id']}/messages/send/",
            {"content": "سلام"},
            format="json",
        )
        self.assertEqual(send.status_code, 202, send.data)
        return send.data["assistant_message"]["id"]

    def _consume_sse(self, assistant_id: str) -> str:
        resp = self.client.get(f"/api/ai/messages/{assistant_id}/stream/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "text/event-stream")
        return b"".join(resp.streaming_content).decode("utf-8")

    def test_stream_produces_tokens_and_done(self):
        # در حالت inline، تولید هنگام send اجرا و رویدادها روی حامل بافر می‌شوند؛
        # اندپوینت stream آن‌ها را replay می‌کند.
        assistant_id = self._send_and_get_assistant_id()
        body = self._consume_sse(assistant_id)

        self.assertIn("event: token", body)
        self.assertIn("event: done", body)
        # پاسخ Fake از آخرین پیام کاربر ساخته می‌شود.
        self.assertIn("fake-1", body)
        self.assertIn("سلام", body)

    def test_send_triggers_generation_completed(self):
        # صف inline باعث می‌شود پیام دستیار پس از send تکمیل شود (بدون نیاز به
        # فراخوانی stream) — یعنی تولید واقعاً روی صف اجرا شده است.
        conv = self._create_conversation()
        send = self.client.post(
            f"/api/ai/conversations/{conv['id']}/messages/send/",
            {"content": "سلام"},
            format="json",
        )
        assistant_id = send.data["assistant_message"]["id"]
        self.assertEqual(send.data["assistant_message"]["status"], "pending")

        lst = self.client.get(f"/api/ai/conversations/{conv['id']}/messages/")
        assistant = next(m for m in lst.data["items"] if m["id"] == assistant_id)
        self.assertEqual(assistant["status"], "completed")
        self.assertTrue(assistant["content"])

    def test_stream_replays_after_completion(self):
        # حامل تاریخچه را نگه می‌دارد؛ اشتراک مجدد رویدادها را دوباره relay می‌کند.
        assistant_id = self._send_and_get_assistant_id()
        first = self._consume_sse(assistant_id)
        second = self._consume_sse(assistant_id)
        self.assertIn("event: done", first)
        self.assertIn("event: done", second)

    def test_stream_missing_message_404(self):
        missing = uuid7()
        resp = self.client.get(f"/api/ai/messages/{missing}/stream/")
        self.assertEqual(resp.status_code, 404, getattr(resp, "data", resp))
        self.assertEqual(resp.data["error"]["code"], "NOT_FOUND")
