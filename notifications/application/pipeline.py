"""NotificationPipeline — گلوگاه مرکزی تصمیم‌گیری قبل از ارسال (Chain of Responsibility).

هر stage یکی از سه نتیجه را برمی‌گرداند: ادامه، حذف (با دلیل) یا تعویق (تا زمان مشخص).
ترتیب مهم است: stageهایی که سهمیه مصرف می‌کنند (Dedupe/FrequencyCap) بعد از
QuietHours می‌آیند تا نوتیفِ معوق در اجرای دوباره، به‌خاطر سهمیه‌ی مصرف‌شده‌ی خودش
حذف نشود.
"""
from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from ..domain.entities import Notification, NotificationCategory, UserPreference
from ..domain.enums import Priority, SuppressionReason
from ..domain.value_objects import safe_zone
from .ports import RateLimiter


class Verdict(str, Enum):
    PASS = "PASS"
    SUPPRESS = "SUPPRESS"
    DEFER = "DEFER"


@dataclass(frozen=True)
class StageResult:
    verdict: Verdict
    stage: str = ""
    reason: SuppressionReason | None = None
    until: datetime | None = None
    detail: str = ""

    @classmethod
    def ok(cls) -> "StageResult":
        return cls(Verdict.PASS)


@dataclass
class PipelineContext:
    notification: Notification
    category: NotificationCategory
    preference: UserPreference
    now: datetime


class PipelineStage(ABC):
    name: str = ""

    @abstractmethod
    def evaluate(self, ctx: PipelineContext) -> StageResult: ...

    def suppress(self, reason: SuppressionReason, detail: str = "") -> StageResult:
        return StageResult(Verdict.SUPPRESS, self.name, reason=reason, detail=detail)

    def defer(self, until: datetime, detail: str = "") -> StageResult:
        return StageResult(Verdict.DEFER, self.name, until=until, detail=detail)


class ExpiryStage(PipelineStage):
    name = "expiry"

    def evaluate(self, ctx: PipelineContext) -> StageResult:
        if ctx.notification.is_expired(ctx.now):
            return self.suppress(SuppressionReason.EXPIRED)
        return StageResult.ok()


class PreferenceStage(PipelineStage):
    """کانال‌هایی که کاربر برای این دسته خاموش کرده حذف می‌شوند؛ اگر چیزی نماند، کل نوتیف حذف."""

    name = "preference"

    def evaluate(self, ctx: PipelineContext) -> StageResult:
        n = ctx.notification
        if not ctx.category.is_active and n.priority != Priority.CRITICAL:
            return self.suppress(SuppressionReason.CATEGORY_DISABLED)
        if not (ctx.category.user_configurable and n.policy.respect_user_opt_out):
            return StageResult.ok()
        allowed = {c for c in n.channels if ctx.preference.allows(n.category_key, c)}
        if not allowed:
            return self.suppress(SuppressionReason.USER_PREFERENCE)
        n.restrict_channels(allowed)
        return StageResult.ok()


class QuietHoursStage(PipelineStage):
    name = "quiet_hours"

    def evaluate(self, ctx: PipelineContext) -> StageResult:
        n = ctx.notification
        if n.policy.bypass_quiet_hours:
            return StageResult.ok()
        until = ctx.preference.quiet_until(ctx.now)
        if until is None:
            return StageResult.ok()
        if n.expires_at and n.expires_at <= until:
            return self.suppress(SuppressionReason.EXPIRED, "expires during quiet hours")
        return self.defer(until, "quiet_hours")


class DedupeStage(PipelineStage):
    """جلوی ارسال دوباره‌ی محتوای یکسان در بازه‌ی کوتاه را می‌گیرد (trigger تکراری از کد صدازننده)."""

    name = "dedupe"

    def __init__(self, limiter: RateLimiter, window_seconds: int = 600) -> None:
        self._limiter = limiter
        self._window = window_seconds

    def evaluate(self, ctx: PipelineContext) -> StageResult:
        n = ctx.notification
        fingerprint = hashlib.sha1(
            f"{n.category_key}|{n.content.title}|{n.content.body}|{n.deeplink}".encode()
        ).hexdigest()
        key = f"notif:dedupe:{n.recipient_id}:{fingerprint}"
        if not self._limiter.acquire(key, 1, self._window):
            return self.suppress(SuppressionReason.DUPLICATE)
        return StageResult.ok()


class FrequencyCapStage(PipelineStage):
    """سقف روزانه به ازای کاربر و سطح اهمیت (به وقت محلی کاربر)."""

    name = "frequency_cap"

    def __init__(self, limiter: RateLimiter, daily_caps: dict[Priority, int]) -> None:
        self._limiter = limiter
        self._caps = daily_caps

    def evaluate(self, ctx: PipelineContext) -> StageResult:
        n = ctx.notification
        cap = self._caps.get(n.priority)
        if n.policy.bypass_frequency_cap or not cap:
            return StageResult.ok()
        day = ctx.now.astimezone(safe_zone(ctx.preference.timezone)).date().isoformat()
        key = f"notif:cap:{n.recipient_id}:{n.priority.value}:{day}"
        if not self._limiter.acquire(key, cap, 26 * 3600):
            return self.suppress(SuppressionReason.FREQUENCY_CAP, f"cap={cap}")
        return StageResult.ok()


class NotificationPipeline:
    def __init__(self, stages: list[PipelineStage]) -> None:
        self._stages = stages

    @property
    def stage_names(self) -> list[str]:
        return [s.name for s in self._stages]

    def run(self, ctx: PipelineContext) -> StageResult:
        for stage in self._stages:
            result = stage.evaluate(ctx)
            if result.verdict != Verdict.PASS:
                return result
        return StageResult.ok()
