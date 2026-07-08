"""تست‌های واحدِ خالص موجودیت‌های دامنه (State Machine و invariantها، بدون DB)."""
from __future__ import annotations

from uuid import uuid4

from django.test import SimpleTestCase

from Ai.domain.entities.attachment import Attachment
from Ai.domain.entities.conversation import Conversation
from Ai.domain.entities.message import Message
from Ai.domain.entities.role_prompt_profile import RolePromptProfile
from Ai.domain.enums import (
    ConversationStatus,
    FileType,
    MessageStatus,
    ParseStatus,
    Role,
    UserRole,
)
from Ai.domain.value_objects.model_config import ModelConfig
from Ai.domain.value_objects.storage_ref import StorageRef
from Ai.domain.value_objects.token_usage import TokenUsage
from Ai.shared.domain.errors import InvalidStateError, ValidationError


def _conversation() -> Conversation:
    return Conversation.start(
        tenant_id=uuid4(),
        user_id=uuid4(),
        model_config=ModelConfig(model_id=uuid4()),
    )


class ConversationTests(SimpleTestCase):
    def test_start_defaults_and_event(self):
        conv = _conversation()
        self.assertEqual(conv.status, ConversationStatus.ACTIVE)
        self.assertEqual(conv.title, "مکالمه جدید")
        self.assertEqual(len(conv.domain_events), 1)

    def test_rename_normalizes(self):
        conv = _conversation()
        conv.rename("  عنوان تازه  ")
        self.assertEqual(conv.title, "عنوان تازه")

    def test_rename_empty_rejected(self):
        conv = _conversation()
        with self.assertRaises(ValidationError):
            conv.rename("   ")

    def test_archive_unarchive_cycle(self):
        conv = _conversation()
        conv.archive()
        self.assertEqual(conv.status, ConversationStatus.ARCHIVED)
        conv.unarchive()
        self.assertEqual(conv.status, ConversationStatus.ACTIVE)

    def test_unarchive_active_rejected(self):
        conv = _conversation()
        with self.assertRaises(InvalidStateError):
            conv.unarchive()

    def test_deleted_blocks_mutations(self):
        conv = _conversation()
        conv.mark_deleted()
        with self.assertRaises(InvalidStateError):
            conv.rename("x")
        with self.assertRaises(InvalidStateError):
            conv.ensure_can_accept_message()

    def test_toggle_flags(self):
        conv = _conversation()
        conv.toggle_pin()
        conv.toggle_favorite()
        self.assertTrue(conv.flags.is_pinned)
        self.assertTrue(conv.flags.is_favorite)


class MessageTests(SimpleTestCase):
    def _assistant(self) -> Message:
        return Message.create_assistant_placeholder(
            tenant_id=uuid4(),
            conversation_id=uuid4(),
            seq=2,
            parent_id=uuid4(),
            model_id=uuid4(),
        )

    def test_user_message_completed_with_content(self):
        msg = Message.create_user_message(
            tenant_id=uuid4(), conversation_id=uuid4(), seq=1, content="سلام"
        )
        self.assertEqual(msg.role, Role.USER)
        self.assertEqual(msg.status, MessageStatus.COMPLETED)
        self.assertEqual(msg.active_version.content, "سلام")

    def test_user_message_empty_rejected(self):
        with self.assertRaises(ValidationError):
            Message.create_user_message(
                tenant_id=uuid4(), conversation_id=uuid4(), seq=1, content="  "
            )

    def test_edit_appends_version(self):
        msg = Message.create_user_message(
            tenant_id=uuid4(), conversation_id=uuid4(), seq=1, content="اول"
        )
        msg.edit("دوم")
        self.assertEqual(len(msg.versions), 2)
        self.assertEqual(msg.active_version.content, "دوم")

    def test_edit_assistant_rejected(self):
        with self.assertRaises(InvalidStateError):
            self._assistant().edit("x")

    def test_streaming_then_complete(self):
        msg = self._assistant()
        msg.begin_streaming()
        self.assertEqual(msg.status, MessageStatus.STREAMING)
        msg.complete(content="پاسخ", usage=TokenUsage(1, 2))
        self.assertEqual(msg.status, MessageStatus.COMPLETED)
        self.assertEqual(msg.active_version.content, "پاسخ")
        # رویداد MessageCompleted ثبت شده باشد.
        self.assertTrue(msg.domain_events)

    def test_double_complete_rejected(self):
        msg = self._assistant()
        msg.complete(content="a", usage=TokenUsage())
        with self.assertRaises(InvalidStateError):
            msg.complete(content="b", usage=TokenUsage())

    def test_retry_only_assistant(self):
        user = Message.create_user_message(
            tenant_id=uuid4(), conversation_id=uuid4(), seq=1, content="x"
        )
        with self.assertRaises(InvalidStateError):
            user.retry()

    def test_retry_from_failed(self):
        msg = self._assistant()
        msg.fail("boom")
        self.assertEqual(msg.status, MessageStatus.FAILED)
        msg.retry()
        self.assertEqual(msg.status, MessageStatus.PENDING)

    def test_regenerate_requires_completed(self):
        msg = self._assistant()
        with self.assertRaises(InvalidStateError):
            msg.regenerate()  # هنوز PENDING است
        msg.complete(content="a", usage=TokenUsage())
        msg.regenerate()
        self.assertEqual(msg.status, MessageStatus.PENDING)


class AttachmentTests(SimpleTestCase):
    def _attachment(self) -> Attachment:
        return Attachment(
            id=uuid4(),
            tenant_id=uuid4(),
            user_id=uuid4(),
            file_type=FileType.PDF,
            storage=StorageRef(bucket="b", key="k", checksum_sha256="c"),
            size_bytes=100,
            mime_type="application/pdf",
        )

    def test_happy_parse_flow(self):
        att = self._attachment()
        for target in (
            ParseStatus.PARSING,
            ParseStatus.PARSED,
            ParseStatus.CHUNKED,
            ParseStatus.EMBEDDED,
        ):
            att.advance_to(target)
        self.assertTrue(att.is_ready_for_rag)

    def test_invalid_transition(self):
        att = self._attachment()
        with self.assertRaises(InvalidStateError):
            att.advance_to(ParseStatus.EMBEDDED)  # پرش از UPLOADED مجاز نیست

    def test_fail_then_retry(self):
        att = self._attachment()
        att.advance_to(ParseStatus.PARSING)
        att.mark_failed("خطای استخراج")
        self.assertEqual(att.parse_status, ParseStatus.FAILED)
        self.assertEqual(att.failure_reason, "خطای استخراج")
        att.advance_to(ParseStatus.PARSING)  # تلاش مجدد مجاز است
        self.assertEqual(att.parse_status, ParseStatus.PARSING)

    def test_embedded_is_terminal(self):
        att = self._attachment()
        for target in (ParseStatus.PARSING, ParseStatus.PARSED, ParseStatus.CHUNKED, ParseStatus.EMBEDDED):
            att.advance_to(target)
        with self.assertRaises(InvalidStateError):
            att.advance_to(ParseStatus.PARSING)


class RolePromptProfileTests(SimpleTestCase):
    def test_update_prompt_bumps_version(self):
        profile = RolePromptProfile(
            id=uuid4(), role=UserRole.TEACHER, system_prompt="اولیه"
        )
        self.assertEqual(profile.version, 1)
        profile.update_prompt("جدید")
        self.assertEqual(profile.system_prompt, "جدید")
        self.assertEqual(profile.version, 2)

    def test_update_prompt_empty_rejected(self):
        profile = RolePromptProfile(
            id=uuid4(), role=UserRole.TEACHER, system_prompt="اولیه"
        )
        with self.assertRaises(ValidationError):
            profile.update_prompt("   ")

    def test_global_default_flag(self):
        glob = RolePromptProfile(id=uuid4(), role=UserRole.STUDENT, system_prompt="x")
        scoped = RolePromptProfile(
            id=uuid4(), role=UserRole.STUDENT, system_prompt="x", tenant_id=uuid4()
        )
        self.assertTrue(glob.is_global_default)
        self.assertFalse(scoped.is_global_default)
