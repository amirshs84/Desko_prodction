"""GenerationRunner — اجرای تولید و انتشار رویدادها روی حامل استریم.

پل میان ``GenerationService`` (که رویدادها را yield می‌کند) و ``StreamTransport``
(که آن‌ها را به consumer می‌رساند). این کلاس هم توسط ``InlineGenerationQueue``
(اجرای همگام در dev) و هم توسط Celery task (اجرای async در prod) استفاده می‌شود؛
منطق «درایو و انتشار» یک‌بار نوشته شده (DRY).

تضمین می‌کند که همیشه یک رویداد پایانی (done/error) منتشر شود تا consumer برای
همیشه بلاک نماند — حتی اگر اعتبارسنجی پیش از استریم شکست بخورد.
"""
from __future__ import annotations

from uuid import UUID

from ...application.ports.stream_transport import StreamEvent, StreamTransport
from ...application.services.generation_service import GenerationService
from ...shared.application.context import RequestContext
from ...shared.domain.errors import DomainError


class GenerationRunner:
    def __init__(
        self,
        *,
        generation_service: GenerationService,
        transport: StreamTransport,
        channel_prefix: str = "stream",
    ) -> None:
        self._gen = generation_service
        self._transport = transport
        self._prefix = channel_prefix

    def channel(self, message_id: UUID) -> str:
        return f"{self._prefix}:{message_id}"

    def run(self, *, message_id: UUID, ctx: RequestContext) -> None:
        channel = self.channel(message_id)
        try:
            for event in self._gen.generate(message_id, ctx):
                self._transport.publish(channel, event)
        except DomainError as exc:
            self._transport.publish(
                channel,
                StreamEvent("error", {"code": exc.code, "message": exc.message}),
            )
        except Exception as exc:  # noqa: BLE001 — هر خطای غیرمنتظره → رویداد پایانی
            self._transport.publish(
                channel,
                StreamEvent("error", {"code": "INTERNAL_ERROR", "message": str(exc)}),
            )
