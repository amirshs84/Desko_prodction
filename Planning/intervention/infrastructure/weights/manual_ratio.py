"""نسبت‌های دستی — وزن‌هایی که خودِ مشاور در فرم برنامه‌ریزی وارد کرده است.

درسی که در ``ratios`` نیامده باشد وزن ۱ می‌گیرد تا نبودِ یک ردیف در فرم، آن درس را
از برنامه حذف نکند.
"""
from __future__ import annotations

from typing import Mapping, Sequence


class ManualRatioWeightCalculator:
    def __init__(self, ratios: Mapping[str, float]) -> None:
        self._ratios = {
            subject: float(value) for subject, value in ratios.items() if float(value) > 0
        }

    def weights(self, *, student_id: int, subjects: Sequence[str]) -> dict[str, float]:
        return {subject: self._ratios.get(subject, 1.0) for subject in subjects}
