"""TextChunker — تقسیم متن به قطعات هم‌پوشان برای تعبیه/بازیابی.

استراتژی: پنجره‌ی ثابت بر حسب کاراکتر با هم‌پوشانی (overlap). هم‌پوشانی از
«بریدن معنا» در مرز قطعات جلوگیری می‌کند تا بازیابی دقیق‌تر شود. مرزها تا حد
امکان روی فاصله‌ی سفید تنظیم می‌شوند تا کلمه‌ها نصف نشوند.

این یک policy سبک و framework-agnostic است؛ در آینده می‌توان با tokenizer یا
تقسیم‌بندی معنایی (semantic) جایگزین کرد.
"""
from __future__ import annotations


class TextChunker:
    def __init__(self, *, chunk_size: int = 1000, overlap: int = 150) -> None:
        if overlap >= chunk_size:
            raise ValueError("overlap باید کوچک‌تر از chunk_size باشد.")
        self._size = chunk_size
        self._overlap = overlap

    def split(self, text: str) -> list[str]:
        text = (text or "").strip()
        if not text:
            return []
        if len(text) <= self._size:
            return [text]

        chunks: list[str] = []
        start = 0
        n = len(text)
        while start < n:
            end = min(start + self._size, n)
            # تلاش برای بریدن روی نزدیک‌ترین فاصله‌ی سفید قبل از end.
            if end < n:
                ws = text.rfind(" ", start, end)
                if ws > start:
                    end = ws
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= n:
                break
            # گام بعد با هم‌پوشانی؛ تضمین پیشرفت برای جلوگیری از حلقه‌ی بی‌پایان.
            next_start = end - self._overlap
            start = next_start if next_start > start else end
        return chunks
