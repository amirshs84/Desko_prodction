"""Serializer های ورودی و توابع نگاشت DTO → dict خروجی.

Serializer ها فقط «اعتبارسنجی شکل ورودی HTTP» را انجام می‌دهند (نه منطق کسب‌وکار).
خروجی‌ها از DTO های framework-agnostic ساخته می‌شوند تا مرز HTTP از دامنه جدا
بماند.
"""
from __future__ import annotations

from rest_framework import serializers

from ...application.dto.attachment_dto import AttachmentDTO
from ...application.dto.conversation_dto import ConversationDTO
from ...application.dto.message_dto import MessageDTO
from ...domain.entities.ai_model import AIModel


# ---------- ورودی: مکالمه ----------


class CreateConversationSerializer(serializers.Serializer):
    model_id = serializers.UUIDField()
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)
    temperature = serializers.FloatField(required=False, default=0.7, min_value=0.0, max_value=2.0)
    top_p = serializers.FloatField(required=False, default=1.0, min_value=0.0, max_value=1.0)
    max_output_tokens = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class RenameConversationSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    expected_version = serializers.IntegerField(min_value=1)


class MutateConversationSerializer(serializers.Serializer):
    expected_version = serializers.IntegerField(min_value=1)


class ChangeModelSerializer(serializers.Serializer):
    model_id = serializers.UUIDField()
    expected_version = serializers.IntegerField(min_value=1)


# ---------- ورودی: پیام ----------


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    quoted_message_id = serializers.UUIDField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(required=False, allow_null=True, max_length=200)


class EditMessageSerializer(serializers.Serializer):
    new_content = serializers.CharField()
    expected_version = serializers.IntegerField(min_value=1)


class MutateMessageSerializer(serializers.Serializer):
    expected_version = serializers.IntegerField(min_value=1)


# ---------- خروجی: نگاشت DTO → dict ----------


def conversation_out(dto: ConversationDTO) -> dict:
    return {
        "id": str(dto.id),
        "title": dto.title,
        "status": dto.status,
        "is_pinned": dto.is_pinned,
        "is_favorite": dto.is_favorite,
        "model_id": str(dto.model_id),
        "version": dto.version,
    }


def message_out(dto: MessageDTO) -> dict:
    return {
        "id": str(dto.id),
        "conversation_id": str(dto.conversation_id),
        "role": dto.role,
        "status": dto.status,
        "seq": dto.seq,
        "content": dto.content,
        "parent_id": str(dto.parent_id) if dto.parent_id else None,
        "active_version_id": str(dto.active_version_id) if dto.active_version_id else None,
        "model_id": str(dto.model_id) if dto.model_id else None,
        "version": dto.version,
    }


def model_out(model: AIModel) -> dict:
    return {
        "id": str(model.id),
        "key": model.key,
        "display_name": model.display_name,
        "provider_key": model.provider_key,
        "context_window": model.context_window,
        "max_output_tokens": model.max_output_tokens,
        "capabilities": sorted(c.value for c in model.capabilities),
    }


def attachment_out(dto: AttachmentDTO) -> dict:
    return {
        "id": str(dto.id),
        "file_type": dto.file_type,
        "size_bytes": dto.size_bytes,
        "mime_type": dto.mime_type,
        "parse_status": dto.parse_status,
        "checksum_sha256": dto.checksum_sha256,
        "is_ready_for_rag": dto.is_ready_for_rag,
    }
