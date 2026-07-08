"""تبدیل StreamEvent و RequestContext به/از dict برای عبور از مرز صف/حامل.

Celery و Redis فقط داده‌ی JSON-serializable می‌پذیرند؛ UUID و dataclass باید به
شکل ساده تبدیل شوند.
"""
from __future__ import annotations

from uuid import UUID

from ...application.ports.stream_transport import StreamEvent
from ...shared.application.context import RequestContext


def event_to_dict(event: StreamEvent) -> dict:
    return {"event": event.event, "data": event.data}


def event_from_dict(raw: dict) -> StreamEvent:
    return StreamEvent(event=raw["event"], data=raw.get("data") or {})


def context_to_dict(ctx: RequestContext) -> dict:
    return {
        "tenant_id": str(ctx.tenant_id),
        "user_id": str(ctx.user_id),
        "role": ctx.role,
        "trace_id": ctx.trace_id,
    }


def context_from_dict(raw: dict) -> RequestContext:
    return RequestContext(
        tenant_id=UUID(raw["tenant_id"]),
        user_id=UUID(raw["user_id"]),
        role=raw["role"],
        trace_id=raw["trace_id"],
    )
