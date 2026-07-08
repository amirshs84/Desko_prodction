"""نگاشت دوطرفه بین موجودیت‌های دامنه و مدل‌های Django.

این ماژول تنها جایی است که «شکل دیتابیس» به «شکل دامنه» ترجمه می‌شود. با تمرکز
نگاشت در اینجا، ORM از دامنه بیرون درز نمی‌کند و تغییر شِمای دیتابیس، دامنه را
نمی‌شکند (فقط mapper به‌روز می‌شود).
"""
from __future__ import annotations

from ...domain.entities.ai_model import AIModel
from ...domain.entities.attachment import Attachment
from ...domain.entities.conversation import Conversation
from ...domain.entities.conversation_summary import ConversationSummary
from ...domain.entities.message import Message
from ...domain.entities.message_version import MessageVersion
from ...domain.entities.role_prompt_profile import RolePromptProfile
from ...domain.entities.usage_record import UsageRecord
from ...domain.enums import (
    Capability,
    ConversationStatus,
    FileType,
    MessageStatus,
    ParseStatus,
    Role,
    UserRole,
)
from ...domain.value_objects.flags import ConversationFlags
from ...domain.value_objects.model_config import ModelConfig
from ...domain.value_objects.storage_ref import StorageRef
from ...domain.value_objects.token_usage import TokenUsage
from . import models as m


class AIModelMapper:
    @staticmethod
    def to_entity(row: m.AIModelModel) -> AIModel:
        return AIModel(
            id=row.id,
            provider_key=row.provider_key,
            key=row.key,
            display_name=row.display_name,
            context_window=row.context_window,
            max_output_tokens=row.max_output_tokens,
            capabilities=frozenset(Capability(c) for c in row.capabilities),
            priority=row.priority,
            is_active=row.is_active,
        )


class ConversationMapper:
    @staticmethod
    def to_entity(row: m.ConversationModel) -> Conversation:
        return Conversation(
            id=row.id,
            tenant_id=row.tenant_id,
            user_id=row.user_id,
            title=row.title,
            model_config=ModelConfig(
                model_id=row.model_id,
                temperature=row.temperature,
                top_p=row.top_p,
                max_output_tokens=row.max_output_tokens,
            ),
            status=ConversationStatus(row.status),
            flags=ConversationFlags(
                is_pinned=row.is_pinned, is_favorite=row.is_favorite
            ),
            version=row.version,
        )

    @staticmethod
    def apply_to_row(entity: Conversation, row: m.ConversationModel) -> None:
        row.tenant_id = entity.tenant_id
        row.user_id = entity.user_id
        row.title = entity.title
        row.status = entity.status.value
        row.is_pinned = entity.flags.is_pinned
        row.is_favorite = entity.flags.is_favorite
        row.model_id = entity.model_config.model_id
        row.temperature = entity.model_config.temperature
        row.top_p = entity.model_config.top_p
        row.max_output_tokens = entity.model_config.max_output_tokens


class MessageVersionMapper:
    @staticmethod
    def to_entity(row: m.MessageVersionModel) -> MessageVersion:
        usage = None
        if row.prompt_tokens or row.completion_tokens:
            usage = TokenUsage(row.prompt_tokens, row.completion_tokens)
        return MessageVersion(
            id=row.id,
            message_id=row.message_id,
            version_no=row.version_no,
            content=row.content,
            finish_reason=row.finish_reason,
            usage=usage,
        )


class MessageMapper:
    @staticmethod
    def to_entity(
        row: m.MessageModel, versions: list[m.MessageVersionModel]
    ) -> Message:
        entity = Message(
            id=row.id,
            tenant_id=row.tenant_id,
            conversation_id=row.conversation_id,
            role=Role(row.role),
            status=MessageStatus(row.status),
            seq=row.seq,
            parent_id=row.parent_id,
            quoted_message_id=row.quoted_message_id,
            thread_root_id=row.thread_root_id,
            model_id=row.model_id,
            active_version_id=row.active_version_id,
            versions=[MessageVersionMapper.to_entity(v) for v in versions],
            version=row.version,
        )
        return entity

    @staticmethod
    def apply_to_row(entity: Message, row: m.MessageModel) -> None:
        row.tenant_id = entity.tenant_id
        row.conversation_id = entity.conversation_id
        row.role = entity.role.value
        row.status = entity.status.value
        row.seq = entity.seq
        row.parent_id = entity.parent_id
        row.quoted_message_id = entity.quoted_message_id
        row.thread_root_id = entity.thread_root_id
        row.model_id = entity.model_id
        row.active_version_id = entity.active_version_id


class AttachmentMapper:
    @staticmethod
    def to_entity(row: m.AttachmentModel) -> Attachment:
        return Attachment(
            id=row.id,
            tenant_id=row.tenant_id,
            user_id=row.user_id,
            file_type=FileType(row.file_type),
            storage=StorageRef(
                bucket=row.bucket,
                key=row.storage_key,
                checksum_sha256=row.checksum_sha256,
            ),
            size_bytes=row.size_bytes,
            mime_type=row.mime_type,
            parse_status=ParseStatus(row.parse_status),
            extracted_text=row.extracted_text,
            failure_reason=row.failure_reason,
        )

    @staticmethod
    def apply_to_row(entity: Attachment, row: m.AttachmentModel) -> None:
        row.tenant_id = entity.tenant_id
        row.user_id = entity.user_id
        row.file_type = entity.file_type.value
        row.bucket = entity.storage.bucket
        row.storage_key = entity.storage.key
        row.checksum_sha256 = entity.storage.checksum_sha256
        row.size_bytes = entity.size_bytes
        row.mime_type = entity.mime_type
        row.parse_status = entity.parse_status.value
        row.extracted_text = entity.extracted_text
        row.failure_reason = entity.failure_reason


class RolePromptProfileMapper:
    @staticmethod
    def to_entity(row: m.RolePromptProfileModel) -> RolePromptProfile:
        return RolePromptProfile(
            id=row.id,
            role=UserRole(row.role),
            system_prompt=row.system_prompt,
            tenant_id=row.tenant_id,
            parameters=row.parameters,
            guardrails=row.guardrails,
            version=row.version,
            is_active=row.is_active,
        )

    @staticmethod
    def apply_to_row(
        entity: RolePromptProfile, row: m.RolePromptProfileModel
    ) -> None:
        row.tenant_id = entity.tenant_id
        row.role = entity.role.value
        row.system_prompt = entity.system_prompt
        row.parameters = entity.parameters
        row.guardrails = entity.guardrails
        row.version = entity.version
        row.is_active = entity.is_active


class ConversationSummaryMapper:
    @staticmethod
    def to_entity(row: m.ConversationSummaryModel) -> ConversationSummary:
        return ConversationSummary(
            id=row.id,
            tenant_id=row.tenant_id,
            conversation_id=row.conversation_id,
            up_to_seq=row.up_to_seq,
            summary=row.summary,
            token_count=row.token_count,
        )


class UsageRecordMapper:
    @staticmethod
    def to_entity(row: m.UsageRecordModel) -> UsageRecord:
        return UsageRecord(
            id=row.id,
            tenant_id=row.tenant_id,
            user_id=row.user_id,
            message_id=row.message_id,
            model_id=row.model_id,
            usage=TokenUsage(row.prompt_tokens, row.completion_tokens),
            cost=row.cost,
            currency=row.currency,
        )
