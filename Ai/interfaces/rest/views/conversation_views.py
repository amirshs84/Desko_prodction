"""View های مکالمه — نازک (thin): فقط اعتبارسنجی، تبدیل به Command، فراخوانی
سرویس و نگاشت خروجی. هیچ منطق کسب‌وکاری اینجا نیست (Clean Architecture).
"""
from __future__ import annotations

from uuid import UUID

from rest_framework import status
from rest_framework.response import Response

from ....container import get_container
from ....application.commands.conversation_commands import (
    ChangeModelCommand,
    CreateConversationCommand,
    MutateConversationCommand,
    RenameConversationCommand,
)
from ....domain.repositories.conversation_repository import ConversationFilter
from ..context import build_request_context
from ..errors import BaseAIView
from ..pagination import page_envelope, parse_pagination
from ..serializers import (
    ChangeModelSerializer,
    CreateConversationSerializer,
    MutateConversationSerializer,
    RenameConversationSerializer,
    conversation_out,
)


class ConversationListCreateView(BaseAIView):
    def get(self, request):
        ctx = build_request_context(request)
        cursor, limit = parse_pagination(request)
        q = request.query_params
        filters = ConversationFilter(
            pinned_only=q.get("pinned") == "true",
            favorite_only=q.get("favorite") == "true",
            include_archived=q.get("archived") == "true",
            search=q.get("search") or None,
        )
        page = get_container().conversation_service.list(
            filters, ctx, cursor=cursor, limit=limit
        )
        items = [conversation_out(c) for c in page.items]
        return Response(page_envelope(page, items))

    def post(self, request):
        ctx = build_request_context(request)
        s = CreateConversationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        cmd = CreateConversationCommand(
            model_id=d["model_id"],
            title=d.get("title") or None,
            temperature=d.get("temperature", 0.7),
            top_p=d.get("top_p", 1.0),
            max_output_tokens=d.get("max_output_tokens"),
        )
        dto = get_container().conversation_service.create(cmd, ctx)
        return Response(conversation_out(dto), status=status.HTTP_201_CREATED)


class ConversationDetailView(BaseAIView):
    def get(self, request, conversation_id: UUID):
        ctx = build_request_context(request)
        dto = get_container().conversation_service.get(conversation_id, ctx)
        return Response(conversation_out(dto))

    def patch(self, request, conversation_id: UUID):
        ctx = build_request_context(request)
        s = RenameConversationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        cmd = RenameConversationCommand(
            conversation_id=conversation_id,
            title=s.validated_data["title"],
            expected_version=s.validated_data["expected_version"],
        )
        dto = get_container().conversation_service.rename(cmd, ctx)
        return Response(conversation_out(dto))

    def delete(self, request, conversation_id: UUID):
        ctx = build_request_context(request)
        s = MutateConversationSerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        cmd = MutateConversationCommand(
            conversation_id=conversation_id,
            expected_version=s.validated_data["expected_version"],
        )
        get_container().conversation_service.delete(cmd, ctx)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationActionView(BaseAIView):
    """اکشن‌های وضعیتی: pin | favorite | archive | unarchive | change-model."""

    def post(self, request, conversation_id: UUID, action: str):
        ctx = build_request_context(request)
        svc = get_container().conversation_service

        if action == "change-model":
            s = ChangeModelSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            cmd = ChangeModelCommand(
                conversation_id=conversation_id,
                model_id=s.validated_data["model_id"],
                expected_version=s.validated_data["expected_version"],
            )
            return Response(conversation_out(svc.change_model(cmd, ctx)))

        s = MutateConversationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        cmd = MutateConversationCommand(
            conversation_id=conversation_id,
            expected_version=s.validated_data["expected_version"],
        )
        handlers = {
            "pin": svc.toggle_pin,
            "favorite": svc.toggle_favorite,
            "archive": svc.archive,
            "unarchive": svc.unarchive,
        }
        handler = handlers.get(action)
        if handler is None:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "اکشن نامعتبر است."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(conversation_out(handler(cmd, ctx)))
