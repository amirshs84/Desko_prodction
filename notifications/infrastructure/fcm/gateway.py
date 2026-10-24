"""FcmPushGateway — ارسال از طریق firebase-admin (HTTP v1)."""
from __future__ import annotations

import json
import logging
import os
import threading
from collections.abc import Callable
from datetime import datetime

from ...application.ports import PushGateway, PushResult
from ...domain.entities import Device, Notification
from ...domain.errors import PushProviderError
from .payloads import FcmMessageSpec, PayloadBuilder

logger = logging.getLogger(__name__)

FCM_BATCH = 500
_INVALID_TOKEN_ERRORS = {"UnregisteredError", "SenderIdMismatchError"}
_RETRYABLE_ERRORS = {"QuotaExceededError", "UnavailableError", "InternalError"}


class FcmPushGateway(PushGateway):
    _app_lock = threading.Lock()

    def __init__(
        self,
        *,
        credentials: str,
        builders: dict,
        clock: Callable[[], datetime],
        app_name: str = "desko-notifications",
    ) -> None:
        self._credentials = credentials
        self._builders: dict = builders
        self._clock = clock
        self._app_name = app_name
        self._app = None

    def send(self, notification: Notification, devices: list[Device]) -> list[PushResult]:
        now = self._clock()
        specs: list[tuple[Device, FcmMessageSpec]] = []
        results: dict = {}
        for d in devices:
            builder: PayloadBuilder | None = self._builders.get(d.platform)
            if builder is None:
                results[d.id] = PushResult(d.id, False, error=f"no builder for {d.platform.value}")
                continue
            specs.append((d, builder.build(notification, d, now)))

        for i in range(0, len(specs), FCM_BATCH):
            chunk = specs[i : i + FCM_BATCH]
            for (device, _), result in zip(chunk, self._send_chunk([s for _, s in chunk])):
                results[device.id] = PushResult(device_id=device.id, **result)
        return [results[d.id] for d in devices]

    def _send_chunk(self, specs: list[FcmMessageSpec]) -> list[dict]:
        from firebase_admin import messaging

        messages = [self._to_message(messaging, s) for s in specs]
        try:
            batch = messaging.send_each(messages, app=self._get_app())
        except Exception as exc:  # noqa: BLE001 - خطای شبکه/اعتبارنامه برای کل batch
            logger.warning("FCM batch failed: %s", exc)
            raise PushProviderError(str(exc), retryable=True) from exc

        out = []
        for r in batch.responses:
            if r.success:
                out.append({"success": True, "message_id": r.message_id or ""})
                continue
            name = type(r.exception).__name__ if r.exception else "UnknownError"
            out.append(
                {
                    "success": False,
                    "error": f"{name}: {r.exception}"[:500],
                    "token_invalid": name in _INVALID_TOKEN_ERRORS,
                    "retryable": name in _RETRYABLE_ERRORS,
                }
            )
        return out

    @staticmethod
    def _to_message(messaging, s: FcmMessageSpec):
        android = None
        if s.android:
            android = messaging.AndroidConfig(
                priority=s.android.get("priority"),
                ttl=s.android.get("ttl"),
                collapse_key=s.android.get("collapse_key"),
            )
        webpush = messaging.WebpushConfig(headers=s.webpush.get("headers")) if s.webpush else None
        apns = None
        if s.apns:
            aps = s.apns["payload"]["aps"]
            apns = messaging.APNSConfig(
                headers=s.apns.get("headers"),
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(**aps["alert"]),
                        mutable_content=bool(aps.get("mutable-content")),
                        sound=aps.get("sound"),
                        category=aps.get("category"),
                        thread_id=aps.get("thread-id"),
                    )
                ),
            )
        return messaging.Message(
            token=s.token, data=s.data, android=android, webpush=webpush, apns=apns
        )

    def _get_app(self):
        if self._app is not None:
            return self._app
        import firebase_admin
        from firebase_admin import credentials

        with self._app_lock:
            try:
                self._app = firebase_admin.get_app(self._app_name)
            except ValueError:
                raw = self._credentials.strip()
                if raw.startswith("{"):
                    cred = credentials.Certificate(json.loads(raw))
                elif os.path.exists(raw):
                    cred = credentials.Certificate(raw)
                else:
                    raise PushProviderError(
                        f"FIREBASE_CREDENTIALS not found: {raw!r}", retryable=False
                    )
                self._app = firebase_admin.initialize_app(cred, name=self._app_name)
        return self._app


class LoggingPushGateway(PushGateway):
    """وقتی FIREBASE_CREDENTIALS تنظیم نیست (dev/test): پیام‌ها فقط لاگ و نگه داشته می‌شوند."""

    def __init__(self, builders: dict, clock: Callable[[], datetime]) -> None:
        self._builders = builders
        self._clock = clock
        self.sent: list[FcmMessageSpec] = []

    def send(self, notification: Notification, devices: list[Device]) -> list[PushResult]:
        results = []
        for d in devices:
            builder = self._builders.get(d.platform)
            if builder is None:
                results.append(PushResult(d.id, False, error="no builder"))
                continue
            spec = builder.build(notification, d, self._clock())
            self.sent.append(spec)
            logger.info("PUSH(fake) → %s %s: %s", d.platform.value, d.id, spec.data.get("title"))
            results.append(PushResult(d.id, True, message_id=f"fake-{notification.id}"))
        return results
