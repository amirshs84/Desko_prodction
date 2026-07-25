"""توزیع یکنواخت — پیاده‌سازی پیش‌فرض وزن‌دهی در MVP.

هیچ داده‌ای از دانش‌آموز نمی‌خواند؛ همه‌ی درس‌ها وزن یکسان می‌گیرند. جای همین کلاس
است که روزی ماژول AI می‌نشیند.
"""
from __future__ import annotations

from typing import Sequence


class EqualDistributionWeightCalculator:
    def weights(self, *, student_id: int, subjects: Sequence[str]) -> dict[str, float]:
        return {subject: 1.0 for subject in subjects}
