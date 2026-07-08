"""تست‌های واحدِ خالص Value Object ها (بدون DB — سریع و قطعی)."""
from __future__ import annotations

from uuid import uuid4

from django.test import SimpleTestCase

from Ai.domain.value_objects.flags import ConversationFlags
from Ai.domain.value_objects.model_config import ModelConfig
from Ai.domain.value_objects.token_usage import TokenUsage
from Ai.shared.domain.errors import ValidationError
from Ai.shared.domain.pagination import decode_cursor, encode_cursor


class ModelConfigTests(SimpleTestCase):
    def test_valid_defaults(self):
        cfg = ModelConfig(model_id=uuid4())
        self.assertEqual(cfg.temperature, 0.7)
        self.assertEqual(cfg.top_p, 1.0)
        self.assertIsNone(cfg.max_output_tokens)

    def test_temperature_out_of_range(self):
        with self.assertRaises(ValidationError):
            ModelConfig(model_id=uuid4(), temperature=2.5)

    def test_top_p_out_of_range(self):
        with self.assertRaises(ValidationError):
            ModelConfig(model_id=uuid4(), top_p=1.5)

    def test_non_positive_max_output(self):
        with self.assertRaises(ValidationError):
            ModelConfig(model_id=uuid4(), max_output_tokens=0)

    def test_with_model_keeps_params(self):
        cfg = ModelConfig(model_id=uuid4(), temperature=0.3, top_p=0.9)
        new_id = uuid4()
        replaced = cfg.with_model(new_id)
        self.assertEqual(replaced.model_id, new_id)
        self.assertEqual(replaced.temperature, 0.3)
        self.assertEqual(replaced.top_p, 0.9)
        # تغییرناپذیری: نسخه‌ی اصلی دست‌نخورده.
        self.assertNotEqual(cfg.model_id, new_id)


class TokenUsageTests(SimpleTestCase):
    def test_total(self):
        usage = TokenUsage(prompt_tokens=10, completion_tokens=5)
        self.assertEqual(usage.total_tokens, 15)

    def test_add(self):
        a = TokenUsage(prompt_tokens=10, completion_tokens=5)
        b = TokenUsage(prompt_tokens=3, completion_tokens=7)
        total = a + b
        self.assertEqual(total.prompt_tokens, 13)
        self.assertEqual(total.completion_tokens, 12)

    def test_negative_rejected(self):
        with self.assertRaises(ValidationError):
            TokenUsage(prompt_tokens=-1)


class ConversationFlagsTests(SimpleTestCase):
    def test_toggle_pin_is_immutable(self):
        flags = ConversationFlags()
        toggled = flags.toggled_pin()
        self.assertTrue(toggled.is_pinned)
        self.assertFalse(flags.is_pinned)  # اصل تغییر نکرده

    def test_toggle_favorite(self):
        flags = ConversationFlags(is_pinned=True)
        toggled = flags.toggled_favorite()
        self.assertTrue(toggled.is_favorite)
        self.assertTrue(toggled.is_pinned)  # فلگ دیگر حفظ می‌شود


class CursorTests(SimpleTestCase):
    def test_roundtrip(self):
        payload = {"seq": 42, "id": "abc"}
        encoded = encode_cursor(payload)
        self.assertIsInstance(encoded, str)
        self.assertEqual(decode_cursor(encoded), payload)

    def test_opaque_not_plaintext(self):
        encoded = encode_cursor({"seq": 1})
        self.assertNotIn("seq", encoded)  # base64، نه متن خام
