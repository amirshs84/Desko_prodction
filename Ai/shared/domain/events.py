"""پایه‌ی Domain Event.

رویدادهای دامنه واقعیت‌هایی هستند که «اتفاق افتاده‌اند» (گذشته)، مثل
MessageCompleted یا ConversationArchived. Aggregate ها آن‌ها را ثبت می‌کنند و
لایه‌ی application پس از commit منتشرشان می‌کند (برای decouple کردن Contextها).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class DomainEvent:
    """پایه‌ی همه‌ی رویدادهای دامنه.

    هر رویداد یک شناسه‌ی یکتا و زمان وقوع دارد تا قابل ردیابی و idempotent باشد.
    """

    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=_utcnow)
