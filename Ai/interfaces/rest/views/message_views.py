"""View های پیام — ارسال، فهرست، و اکشن‌های ویرایش/حذف/تلاش‌مجدد/تولید‌مجدد."""
from __future__ import annotations

from uuid import UUID

from rest_framework import status
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from ....container import get_container
from ....application.commands.message_commands import (
    EditMessageCommand,
    MutateMessageCommand,
    SendMessageCommand,
)
from ..context import build_request_context
from ..errors import BaseAIView, EventStreamRenderer
from ..pagination import page_envelope, parse_order, parse_pagination
from ..serializers import (
    EditMessageSerializer,
    MutateMessageSerializer,
    SendMessageSerializer,
    message_out,
)
from ..sse import sse_response


class MessageListView(BaseAIView):
    def get(self, request, conversation_id: UUID):
        ctx = build_request_context(request)
        cursor, limit = parse_pagination(request)
        order = parse_order(request, default="desc")
        page = get_container().message_query_service.list_messages(
            conversation_id, ctx, cursor=cursor, limit=limit, order=order
        )
        items = [message_out(m) for m in page.items]
        return Response(page_envelope(page, items))


class SendMessageView(BaseAIView):
    def post(self, request, conversation_id: UUID):
        ctx = build_request_context(request)
        s = SendMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        cmd = SendMessageCommand(
            conversation_id=conversation_id,
            content=d["content"],
            parent_id=d.get("parent_id"),
            quoted_message_id=d.get("quoted_message_id"),
            idempotency_key=d.get("idempotency_key"),
        )
        result = get_container().send_message_service.execute(cmd, ctx)
        return Response(
            {
                "user_message": message_out(result.user_message),
                "assistant_message": message_out(result.assistant_message),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class MessageStreamView(BaseAIView):
    """استریم زنده‌ی تولید پاسخ دستیار (SSE) — سمت consumer.

    تولید توسط ``send`` روی صف (Celery/inline) زمان‌بندی می‌شود و worker رویدادها
    را روی حامل استریم منتشر می‌کند؛ این اندپوینت فقط به کانال همان پیام مشترک
    می‌شود و رویدادها را relay می‌کند. حامل (Redis Streams/درون‌حافظه‌ای) تاریخچه
    را نگه می‌دارد، پس حتی اگر کلاینت کمی دیرتر متصل شود توکن‌ها را از دست نمی‌دهد.

    پیش از استریم، وجود و تعلق پیام به مستأجر بررسی می‌شود تا 404/403 درست
    بازگردد (پس از شروع استریم، هدرها رفته و فقط رویداد error ممکن است).
    """

    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def get(self, request, message_id: UUID):
        ctx = build_request_context(request)
        container = get_container()
        # اعتبارسنجی دسترسی/وجود (تعلق به مستأجر) → 404 پیش از شروع استریم.
        container.message_query_service.get_message(message_id, ctx)
        channel = container.stream_channel(message_id)
        events = container.stream_transport.subscribe(
            channel, timeout=container.config.stream_timeout
        )
        return sse_response(events)


class MessageActionView(BaseAIView):
    """اکشن‌های پیام: edit (PATCH) | delete (DELETE) | retry|regenerate (POST)."""

    def patch(self, request, message_id: UUID):
        ctx = build_request_context(request)
        s = EditMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        cmd = EditMessageCommand(
            message_id=message_id,
            new_content=s.validated_data["new_content"],
            expected_version=s.validated_data["expected_version"],
        )
        return Response(message_out(get_container().message_service.edit(cmd, ctx)))

    def delete(self, request, message_id: UUID):
        ctx = build_request_context(request)
        s = MutateMessageSerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        cmd = MutateMessageCommand(
            message_id=message_id,
            expected_version=s.validated_data["expected_version"],
        )
        get_container().message_service.delete(cmd, ctx)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request, message_id: UUID, action: str):
        ctx = build_request_context(request)
        s = MutateMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        cmd = MutateMessageCommand(
            message_id=message_id,
            expected_version=s.validated_data["expected_version"],
        )
        svc = get_container().message_service
        handlers = {"retry": svc.retry, "regenerate": svc.regenerate}
        handler = handlers.get(action)
        if handler is None:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "اکشن نامعتبر است."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(message_out(handler(cmd, ctx)))
