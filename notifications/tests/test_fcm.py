"""قرارداد پیلود v1 و رفتار FcmPushGateway با mock (بدون شبکه)."""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from notifications.domain.entities import Device
from notifications.domain.enums import ChannelType, ContentStyle, Platform, Priority
from notifications.domain.errors import PushProviderError
from notifications.domain.value_objects import NotificationAction, NotificationContent
from notifications.infrastructure.fcm.gateway import FcmPushGateway, LoggingPushGateway
from notifications.infrastructure.fcm.payloads import (
    MAX_DATA_BYTES,
    PAYLOAD_VERSION,
    AndroidPayloadBuilder,
    ApnsPayloadBuilder,
    WebPayloadBuilder,
    build_data,
    default_builders,
)
from notifications.tests.factories import now, notification

SCHEMA_PATH = (
    Path(__file__).resolve().parents[1] / "contracts" / "push_payload_v1.schema.json"
)


def _device(platform=Platform.ANDROID) -> Device:
    return Device.register(
        user_id=1, platform=platform, token=f"tok-{platform.value}", now=now()
    )


def _validate_contract(data: dict[str, str]) -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    required = schema["required"]
    allowed = set(schema["properties"])
    for key in required:
        if key not in data:
            raise AssertionError(f"missing required field {key}")
    extra = set(data) - allowed
    if extra:
        raise AssertionError(f"unknown fields: {extra}")
    for key, value in data.items():
        if not isinstance(value, str):
            raise AssertionError(f"{key} must be string, got {type(value)}")
    if data["v"] != schema["properties"]["v"]["const"]:
        raise AssertionError("payload version mismatch")
    if data["priority"] not in schema["properties"]["priority"]["enum"]:
        raise AssertionError(data["priority"])
    if data["channel_id"] not in schema["properties"]["channel_id"]["enum"]:
        raise AssertionError(data["channel_id"])
    if data["style"] not in schema["properties"]["style"]["enum"]:
        raise AssertionError(data["style"])
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > MAX_DATA_BYTES:
        raise AssertionError("payload exceeds 4KB")


class PayloadContractTests(SimpleTestCase):
    def test_android_data_only_matches_schema(self):
        n = notification(
            priority=Priority.HIGH,
            channels={ChannelType.PUSH},
            deeplink="/notifications",
            collapse_key="dm:1:2",
            content=NotificationContent(
                title="پیام جدید از مشاور",
                body="سلام",
                style=ContentStyle.BIG_TEXT,
                actions=(
                    NotificationAction(id="open", title="مشاهده"),
                    NotificationAction(id="later", title="بعداً"),
                ),
            ),
        )
        spec = AndroidPayloadBuilder().build(n, _device(), now())
        _validate_contract(spec.data)
        self.assertEqual(spec.data["v"], PAYLOAD_VERSION)
        self.assertEqual(spec.android["priority"], "high")
        self.assertIn("collapse_key", spec.android)
        actions = json.loads(spec.data["actions"])
        self.assertEqual([a["id"] for a in actions], ["open", "later"])

    def test_web_adds_absolute_link(self):
        n = notification(deeplink="/exams/3/take", priority=Priority.CRITICAL)
        spec = WebPayloadBuilder("https://space.mydesko.ir").build(n, _device(Platform.WEB), now())
        _validate_contract(spec.data)
        self.assertEqual(spec.data["link"], "https://space.mydesko.ir/exams/3/take")
        self.assertEqual(spec.webpush["headers"]["Urgency"], "high")

    def test_apns_stub_has_alert_and_mutable_content(self):
        n = notification(priority=Priority.CRITICAL, collapse_key="exam:9")
        spec = ApnsPayloadBuilder().build(n, _device(Platform.IOS), now())
        self.assertEqual(spec.apns["payload"]["aps"]["mutable-content"], 1)
        self.assertEqual(spec.apns["payload"]["aps"]["interruption-level"], "time-sensitive")
        self.assertEqual(spec.apns["headers"]["apns-priority"], "10")

    def test_oversized_payload_is_truncated(self):
        from notifications.infrastructure.fcm.payloads import _fit

        data = build_data(notification())
        data["body"] = "ب" * 5000
        data["data"] = json.dumps({"extra": "x" * 2000}, ensure_ascii=False)
        fitted = _fit(data)
        self.assertEqual(fitted.get("truncated"), "1")
        self.assertLessEqual(
            len(json.dumps(fitted, ensure_ascii=False).encode("utf-8")), MAX_DATA_BYTES
        )
        _validate_contract(fitted)


class FcmGatewayTests(SimpleTestCase):
    def test_logging_gateway_keeps_specs(self):
        gateway = LoggingPushGateway(default_builders("https://space.mydesko.ir"), now)
        n = notification(channels={ChannelType.PUSH})
        results = gateway.send(n, [_device(), _device(Platform.WEB)])
        self.assertTrue(all(r.success for r in results))
        self.assertEqual(len(gateway.sent), 2)

    def test_send_maps_unregistered_and_retryable(self):
        gateway = FcmPushGateway(
            credentials="{}",
            builders=default_builders("https://example.test"),
            clock=now,
        )
        unregistered = MagicMock()
        unregistered.success = False
        unregistered.exception = type("UnregisteredError", (Exception,), {})("gone")
        unregistered.message_id = None
        retry = MagicMock()
        retry.success = False
        retry.exception = type("UnavailableError", (Exception,), {})("busy")
        retry.message_id = None
        ok = MagicMock()
        ok.success = True
        ok.message_id = "mid-1"
        ok.exception = None

        devices = [_device(), _device(Platform.WEB), _device(Platform.IOS)]
        with patch.object(gateway, "_send_chunk", return_value=[
            {"success": False, "error": "UnregisteredError: gone", "token_invalid": True, "retryable": False},
            {"success": False, "error": "UnavailableError: busy", "token_invalid": False, "retryable": True},
            {"success": True, "message_id": "mid-1"},
        ]):
            results = gateway.send(notification(channels={ChannelType.PUSH}), devices)

        self.assertTrue(results[0].token_invalid)
        self.assertTrue(results[1].retryable)
        self.assertTrue(results[2].success)
        self.assertEqual(results[2].message_id, "mid-1")

    def test_send_chunk_wraps_network_error(self):
        gateway = FcmPushGateway(
            credentials="{}",
            builders=default_builders("https://example.test"),
            clock=now,
        )
        spec = AndroidPayloadBuilder().build(
            notification(channels={ChannelType.PUSH}), _device(), now()
        )
        messaging = MagicMock()
        messaging.send_each.side_effect = RuntimeError("timeout")
        admin = MagicMock()
        admin.messaging = messaging
        with (
            patch.dict("sys.modules", {"firebase_admin": admin, "firebase_admin.messaging": messaging}),
            patch.object(gateway, "_get_app", return_value=object()),
            patch.object(gateway, "_to_message", return_value=object()),
        ):
            with self.assertRaises(PushProviderError) as ctx:
                gateway._send_chunk([spec])
        self.assertTrue(ctx.exception.retryable)
