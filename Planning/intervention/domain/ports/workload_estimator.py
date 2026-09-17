"""WorkloadEstimator — تبدیل «تعداد» به «دقیقه» برای یک دانش‌آموز مشخص.

وقتی مشاور می‌گوید «این هفته ۱۰۰ تست ریاضی»، موتور باید بداند این دانش‌آموز چند
دقیقه برای ۱۰۰ تست لازم دارد. جواب برای هر دانش‌آموز فرق می‌کند و با گذشت زمان هم
عوض می‌شود، پس این یک پورت است نه یک فرمول ثابت در دل موتور.

خروجی علاوه بر دقیقه، «اطمینان» را هم برمی‌گرداند: عددی بین ۰ و ۱ که می‌گوید تخمین
چقدر به داده‌ی واقعی همان دانش‌آموز تکیه دارد و چقدر به میانگین جمعیت. مشاور باید
تفاوت «۱۰۰ تست ≈ ۱۲۰ دقیقه بر اساس سابقه‌ی خودش» و «... بر اساس میانگین هم‌پایه‌ها»
را در پیش‌نمایش ببیند.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from ..enums import ActivityKind


@dataclass(frozen=True)
class WorkloadEstimate:
    minutes: int
    #: بین ۰ و ۱؛ صفر یعنی کاملاً بر پایه‌ی prior، یک یعنی کاملاً بر پایه‌ی سابقه‌ی خودش.
    confidence: float
    #: دقیقه به‌ازای هر واحد — برای نمایش «هر تست ۱٫۲ دقیقه» در UI.
    minutes_per_unit: float
    #: تعداد واحد مشاهده‌شده در سابقه؛ مبنای محاسبه‌ی اطمینان.
    observed_units: int = 0


@runtime_checkable
class WorkloadEstimator(Protocol):
    def estimate(
        self,
        *,
        student_id: int,
        subject: str,
        activity: ActivityKind,
        units: int,
        school_id: int | None = None,
    ) -> WorkloadEstimate:
        """چند دقیقه طول می‌کشد تا این دانش‌آموز این تعداد را انجام دهد."""
        ...
