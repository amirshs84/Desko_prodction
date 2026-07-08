"""تست‌های واحدِ خالص قواعد تشخیص نوع فایل (بدون DB)."""
from __future__ import annotations

from django.test import SimpleTestCase

from Ai.domain.enums import FileType
from Ai.domain.file_rules import resolve_file_type
from Ai.shared.domain.errors import ValidationError


class ResolveFileTypeTests(SimpleTestCase):
    def test_mime_takes_priority(self):
        # حتی اگر پسوند گمراه‌کننده باشد، MIH معتبر تعیین‌کننده است.
        result = resolve_file_type(mime_type="application/pdf", filename="x.txt")
        self.assertEqual(result, FileType.PDF)

    def test_mime_with_charset_param(self):
        result = resolve_file_type(
            mime_type="text/plain; charset=utf-8", filename="notes"
        )
        self.assertEqual(result, FileType.TXT)

    def test_fallback_to_extension(self):
        # MIME ناشناخته → از روی پسوند حل می‌شود.
        result = resolve_file_type(
            mime_type="application/octet-stream", filename="sheet.xlsx"
        )
        self.assertEqual(result, FileType.XLSX)

    def test_extension_case_insensitive(self):
        result = resolve_file_type(mime_type="", filename="IMAGE.PNG")
        self.assertEqual(result, FileType.IMAGE)

    def test_unsupported_raises(self):
        with self.assertRaises(ValidationError):
            resolve_file_type(mime_type="application/x-msdownload", filename="a.exe")

    def test_unsupported_meta(self):
        try:
            resolve_file_type(mime_type="", filename="noext")
        except ValidationError as exc:
            self.assertIn("filename", exc.meta)
        else:  # pragma: no cover
            self.fail("انتظار ValidationError داشتیم")
