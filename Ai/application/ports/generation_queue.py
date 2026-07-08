"""Port: GenerationQueue — صف تولید پاسخ هوش مصنوعی.

سرویس همگام (SendMessageService) پس از ذخیره‌ی پیام‌ها، تولید پاسخ را روی این
صف قرار می‌دهد تا یک worker پس‌زمینه (Celery، لایه ۱۶) آن را انجام دهد. چرا
async؟ یک فراخوانی LLM ده‌ها ثانیه I/O دارد؛ اجرای آن در web worker ظرفیت
هم‌زمانی را نابود می‌کند.

لایه‌ی application فقط این قرارداد را می‌بیند؛ اینکه پشت آن Celery/Redis است یا
چیز دیگر، دغدغه‌ی infrastructure است (Dependency Inversion).
"""
from __future__ import annotations

from typing import Protocol
from uuid import UUID

from ...shared.application.context import RequestContext


class GenerationQueue(Protocol):
    def enqueue_generation(
        self, *, message_id: UUID, context: RequestContext
    ) -> None:
        """تولید پاسخ برای یک پیام assistant در وضعیت PENDING را زمان‌بندی می‌کند.

        کل ``context`` (tenant/user/role/trace) حمل می‌شود چون worker پس‌زمینه به
        نقش کاربر برای system prompt نقش‌محور و به tenant برای ایزولاسیون نیاز
        دارد؛ این داده باید در مرز صف serializable باشد.
        """
        ...
