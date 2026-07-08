"""FakeEmbeddingProvider — تعبیه‌ی قطعی و بدون شبکه (dev/تست).

یک بردار با ابعاد ثابت از روی متن می‌سازد به‌گونه‌ای که متن‌های مشابه بردار
نزدیک‌تری بگیرند (بر پایه‌ی شمارش hash کلمات). قطعی است تا تست‌ها پایدار بمانند.
در prod با آداپتور واقعی (OpenAI/local) پشت همان Port ``EmbeddingProvider``
جایگزین می‌شود.
"""
from __future__ import annotations

import hashlib
import math
from typing import ClassVar


class FakeEmbeddingProvider:
    provider_key: ClassVar[str] = "fake"
    dim: ClassVar[int] = 64

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for token in text.lower().split():
            # هش پایدار (hashlib) تا بین پروسه‌ها/اجراها یکسان بماند؛ hash()
            # داخلی پایتون با PYTHONHASHSEED تصادفی می‌شود.
            digest = hashlib.md5(token.encode("utf-8")).hexdigest()
            idx = int(digest, 16) % self.dim
            vec[idx] += 1.0
        # نرمال‌سازی L2 تا شباهت کسینوسی معنادار شود.
        norm = math.sqrt(sum(v * v for v in vec))
        if norm == 0.0:
            return vec
        return [v / norm for v in vec]
