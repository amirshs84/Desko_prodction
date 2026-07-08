"""مدل خطای یکپارچه‌ی دامنه (Framework-agnostic).

این خطاها خالص‌اند و هیچ وابستگی به DRF ندارند. لایه‌ی REST (لایه ۱۴) یک
exception handler دارد که این خطاها را به پاسخ HTTP با ساختار یکسان نگاشت
می‌کند (الهام‌گرفته از RFC 7807 / Problem Details):

    {
      "error": {"code": "...", "message": "...", "detail": "...", "meta": {...}}
    }

هر خطا دو ویژگی کلیدی دارد:
  - ``code``        : شناسه‌ی ماشین‌خوان و ثابت (برای کلاینت/لاگ).
  - ``http_status`` : کد وضعیت HTTP متناظر (استفاده توسط handler لایه REST).
"""
from __future__ import annotations

from typing import Any


class ErrorCode:
    """ثابت‌های ماشین‌خوان کد خطا (تک‌منبع حقیقت)."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    FORBIDDEN = "FORBIDDEN"
    TENANT_MISMATCH = "TENANT_MISMATCH"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    CONCURRENCY_CONFLICT = "CONCURRENCY_CONFLICT"
    INVALID_STATE = "INVALID_STATE"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    RATE_LIMITED = "RATE_LIMITED"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
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


class UnauthenticatedError(DomainError):
    code = ErrorCode.UNAUTHENTICATED
    http_status = 401
    default_message = "احراز هویت لازم است."


class PermissionDeniedError(DomainError):
    code = ErrorCode.FORBIDDEN
    http_status = 403
    default_message = "شما به این منبع دسترسی ندارید."


class TenantMismatchError(PermissionDeniedError):
    code = ErrorCode.TENANT_MISMATCH
    default_message = "این منبع متعلق به سازمان شما نیست."


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


class InvalidStateError(DomainError):
    code = ErrorCode.INVALID_STATE
    http_status = 422
    default_message = "این عملیات در وضعیت فعلی منبع مجاز نیست."


class QuotaExceededError(DomainError):
    code = ErrorCode.QUOTA_EXCEEDED
    http_status = 429
    default_message = "سهمیه‌ی مجاز شما به پایان رسیده است."


class RateLimitedError(DomainError):
    code = ErrorCode.RATE_LIMITED
    http_status = 429
    default_message = "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید."


class ProviderUnavailableError(DomainError):
    code = ErrorCode.PROVIDER_UNAVAILABLE
    http_status = 502
    default_message = "سرویس هوش مصنوعی موقتاً در دسترس نیست."


class ProviderTimeoutError(ProviderUnavailableError):
    code = ErrorCode.PROVIDER_TIMEOUT
    http_status = 504
    default_message = "پاسخ سرویس هوش مصنوعی بیش از حد طول کشید."
