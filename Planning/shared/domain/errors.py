"""مدل خطای یکپارچه‌ی دامنه‌ی Planning (Framework-agnostic).

این خطاها خالص‌اند و هیچ وابستگی به DRF/Django ندارند. لایه‌ی REST یک exception
handler دارد که آن‌ها را به پاسخ HTTP با ساختار یکسان نگاشت می‌کند:

    {"error": {"code": "...", "message": "...", "detail": "...", "meta": {...}}}
"""
from __future__ import annotations

from typing import Any


class ErrorCode:
    """ثابت‌های ماشین‌خوان کد خطا (تک‌منبع حقیقت)."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    FORBIDDEN = "FORBIDDEN"
    SCHOOL_MISMATCH = "SCHOOL_MISMATCH"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    CONCURRENCY_CONFLICT = "CONCURRENCY_CONFLICT"
    INVALID_TIME_RANGE = "INVALID_TIME_RANGE"
    IMMUTABLE_EVENT_VIOLATION = "IMMUTABLE_EVENT_VIOLATION"
    DAILY_CAPACITY_FULL = "DAILY_CAPACITY_FULL"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class DomainError(Exception):
    """پایه‌ی همه‌ی خطاهای دامنه.

    زیرکلاس‌ها فقط ``code``، ``http_status`` و ``default_message`` را بازتعریف
    می‌کنند؛ همین برای تولید پاسخ یکنواخت کافی است.
    """

    code: str = ErrorCode.INTERNAL_ERROR
    http_status: int = 500
    default_message: str = "خطای غیرمنتظره‌ای رخ داد."

    def __init__(
        self,
        message: str | None = None,
        *,
        detail: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.detail = detail
        self.meta = meta or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.detail:
            payload["detail"] = self.detail
        if self.meta:
            payload["meta"] = self.meta
        return payload


class ValidationError(DomainError):
    code = ErrorCode.VALIDATION_ERROR
    http_status = 400
    default_message = "داده‌های ورودی نامعتبر است."


class InvalidTimeRangeError(ValidationError):
    code = ErrorCode.INVALID_TIME_RANGE
    default_message = "بازه‌ی زمانی نامعتبر است."


class PermissionDeniedError(DomainError):
    code = ErrorCode.FORBIDDEN
    http_status = 403
    default_message = "شما به این منبع دسترسی ندارید."


class SchoolMismatchError(PermissionDeniedError):
    code = ErrorCode.SCHOOL_MISMATCH
    default_message = "این دانش‌آموز عضو مدرسه‌ی شما نیست."


class NotFoundError(DomainError):
    code = ErrorCode.NOT_FOUND
    http_status = 404
    default_message = "منبع مورد نظر یافت نشد."


class ConflictError(DomainError):
    code = ErrorCode.CONFLICT
    http_status = 409
    default_message = "تعارض در وضعیت منبع."


class ConcurrencyConflictError(ConflictError):
    code = ErrorCode.CONCURRENCY_CONFLICT
    default_message = "این منبع توسط نشست دیگری تغییر کرده است. دوباره تلاش کنید."


class ImmutableEventViolationError(ConflictError):
    """تلاش برای ساخت/تغییر/حذف رویداد ثابت توسط کسی جز مدیر مدرسه.

    قانون دامنه‌ی سند: رویدادهای ثابت (کلاس مدرسه و فوق‌برنامه‌ی قطعی) تحت هیچ
    شرایطی — حتی در حالت اعمال قطعی الگوریتم — قابل بازنویسی نیستند.
    """

    code = ErrorCode.IMMUTABLE_EVENT_VIOLATION
    default_message = "رویدادهای ثابت مدرسه قابل تغییر یا حذف نیستند."


class DailyCapacityFullError(ConflictError):
    """ظرفیت مجاز روز (پنجره‌ی بیداری) برای جای‌گذاری بلوک پر است."""

    code = ErrorCode.DAILY_CAPACITY_FULL
    default_message = "ظرفیت این روز پر است؛ فضای خالی مناسبی پیدا نشد."
