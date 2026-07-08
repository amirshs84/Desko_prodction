"""پیاده‌سازی MessageRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from django.db.models import Max
from django.utils import timezone

from ....domain.entities.message import Message
from ....domain.repositories.message_repository import MessageRepository
from ....shared.domain.errors import ConcurrencyConflictError
from ....shared.domain.pagination import Page
from ..keyset import build_cursor, parse_cursor
from ..mappers import MessageMapper
from ..models import MessageModel, MessageVersionModel


class DjangoMessageRepository(MessageRepository):
    def add(self, message: Message) -> None:
        row = MessageModel(id=message.id)
        MessageMapper.apply_to_row(message, row)
        row.version = 1
        row.save(force_insert=True)
        self._persist_versions(message)

    def get(self, message_id: UUID, tenant_id: UUID) -> Message | None:
        row = MessageModel.objects.filter(id=message_id, tenant_id=tenant_id).first()
        if row is None:
            return None
        versions = list(
            MessageVersionModel.objects.filter(message_id=row.id).order_by("version_no")
        )
        return MessageMapper.to_entity(row, versions)

    def update(
        self, message: Message, *, expected_version: int | None = None
    ) -> None:
        fields = {
            "role": message.role.value,
            "status": message.status.value,
            "seq": message.seq,
            "parent_id": message.parent_id,
            "quoted_message_id": message.quoted_message_id,
            "thread_root_id": message.thread_root_id,
            "model_id": message.model_id,
            "active_version_id": message.active_version_id,
        }
        base = MessageModel.objects.filter(
            id=message.id, tenant_id=message.tenant_id
        )
        if expected_version is not None:
            updated = base.filter(version=expected_version).update(
                version=expected_version + 1, **fields
            )
            if updated == 0:
                raise ConcurrencyConflictError()
        else:
            base.update(**fields)
        self._persist_versions(message)

    def delete(
        self, message_id: UUID, tenant_id: UUID, *, expected_version: int
    ) -> None:
        updated = MessageModel.objects.filter(
            id=message_id, tenant_id=tenant_id, version=expected_version
        ).update(
            deleted_at=timezone.now(),
            version=expected_version + 1,
        )
        if updated == 0:
            raise ConcurrencyConflictError()

    def next_seq(self, conversation_id: UUID, tenant_id: UUID) -> int:
        # از all_objects استفاده می‌کنیم تا seq حتی با وجود پیام‌های soft-deleted
        # هرگز بازاستفاده نشود (پایداری ترتیب و unique constraint).
        agg = MessageModel.all_objects.filter(
            conversation_id=conversation_id, tenant_id=tenant_id
        ).aggregate(m=Max("seq"))
        return (agg["m"] or 0) + 1

    def list_by_conversation(
        self,
        *,
        conversation_id: UUID,
        tenant_id: UUID,
        cursor: str | None,
        limit: int,
        order: str = "asc",
    ) -> Page[Message]:
        qs = MessageModel.objects.filter(
            conversation_id=conversation_id, tenant_id=tenant_id
        )
        parsed = parse_cursor(cursor)
        descending = order == "desc"

        if descending:
            if parsed is not None:
                last_seq, _ = parsed
                qs = qs.filter(seq__lt=last_seq)
            qs = qs.order_by("-seq")
        else:
            if parsed is not None:
                last_seq, _ = parsed
                qs = qs.filter(seq__gt=last_seq)
            qs = qs.order_by("seq")

        rows = list(qs[: limit + 1])
        has_more = len(rows) > limit
        rows = rows[:limit]
        if descending:
            rows.reverse()
        entities = self._attach_versions(rows)
        next_cursor = (
            build_cursor(sort_value=rows[0].seq, last_id=str(rows[0].id))
            if has_more and rows
            else None
        )
        return Page(
            items=entities, next_cursor=next_cursor, has_more=has_more, limit=limit
        )

    def get_thread(self, *, thread_root_id: UUID, tenant_id: UUID) -> list[Message]:
        rows = list(
            MessageModel.objects.filter(
                thread_root_id=thread_root_id, tenant_id=tenant_id
            ).order_by("seq")
        )
        return self._attach_versions(rows)

    def list_recent(
        self, conversation_id: UUID, tenant_id: UUID, *, limit: int
    ) -> list[Message]:
        rows = list(
            MessageModel.objects.filter(
                conversation_id=conversation_id, tenant_id=tenant_id
            ).order_by("-seq")[:limit]
        )
        return self._attach_versions(rows)

    # ---------- کمکی‌ها ----------

    def _persist_versions(self, message: Message) -> None:
        existing = set(
            MessageVersionModel.objects.filter(message_id=message.id).values_list(
                "id", flat=True
            )
        )
        for v in message.versions:
            if v.id in existing:
                continue
            MessageVersionModel.objects.create(
                id=v.id,
                message_id=message.id,
                version_no=v.version_no,
                content=v.content,
                finish_reason=v.finish_reason,
                prompt_tokens=v.usage.prompt_tokens if v.usage else 0,
                completion_tokens=v.usage.completion_tokens if v.usage else 0,
            )

    def _attach_versions(self, rows: list[MessageModel]) -> list[Message]:
        if not rows:
            return []
        # جلوگیری از N+1: همه‌ی نسخه‌ها را در یک query می‌گیریم و گروه‌بندی می‌کنیم.
        ids = [r.id for r in rows]
        versions_by_msg: dict[UUID, list[MessageVersionModel]] = {}
        for v in MessageVersionModel.objects.filter(message_id__in=ids).order_by(
            "version_no"
        ):
            versions_by_msg.setdefault(v.message_id, []).append(v)
        return [
            MessageMapper.to_entity(r, versions_by_msg.get(r.id, [])) for r in rows
        ]
