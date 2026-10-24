"""خطاهای دامنه‌ی نوتیفیکیشن (مستقل از DRF؛ لایه‌ی REST به HTTP نگاشتشان می‌کند)."""
from __future__ import annotations

from typing import Any


class NotificationError(Exception):
    code: str = "INTERNAL_ERROR"
    http_status: int = 500
    default_message: str = "خطای غیرمنتظره‌ای رخ داد."

    def __init__(self, message: str | None = None, *, meta: dict[str, Any] | None = None) -> None:
        self.message = message or self.default_message
        self.meta = meta or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.meta:
            payload["meta"] = self.meta
        return payload


class InvalidNotification(NotificationError):
    code = "VALIDATION_ERROR"
    http_status = 400
    default_message = "داده‌های نوتیفیکیشن نامعتبر است."


class NotFound(NotificationError):
    code = "NOT_FOUND"
    http_status = 404
    default_message = "منبع مورد نظر یافت نشد."


class PermissionDenied(NotificationError):
    code = "FORBIDDEN"
    http_status = 403
    default_message = "شما به این منبع دسترسی ندارید."


class PushProviderError(NotificationError):
    """خطای سرویس پوش. ``retryable`` تعیین می‌کند retry معنا دارد یا نه."""

    code = "PROVIDER_UNAVAILABLE"
    http_status = 502
    default_message = "سرویس پوش در دسترس نیست."

    def __init__(self, message: str | None = None, *, retryable: bool = True, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)
        self.retryable = retryable
