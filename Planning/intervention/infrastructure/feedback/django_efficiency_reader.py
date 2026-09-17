"""ساخت نیم‌رخ بازدهی از بازخوردهای گیمیفای‌شده‌ی دانش‌آموز.

میانگین ساده کافی نیست: امتیاز سه ماه پیش نباید هم‌وزن امتیاز دیروز باشد. پس از
میانگین نمایی وزن‌دار (EWMA) استفاده می‌کنیم؛ وزن هر بازخورد با فاصله‌ی آن از
جدیدترین بازخورد به‌صورت هندسی افت می‌کند.

خروجی عمداً کلمپ‌شده است. بازخورد یک سیگنال نویزی و خودگزارش‌شده است؛ اجازه نداریم
سه روز بد حال دانش‌آموز، تخمین زمانی‌اش را دو برابر کند.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Sequence

from ...domain.ports.efficiency_profile import (
    MAX_EFFICIENCY,
    MIN_EFFICIENCY,
    NEUTRAL_EFFICIENCY,
    EfficiencyProfile,
    EfficiencyProfileReader,
)
from ..persistence import models as m

#: ضریب افت وزن به‌ازای هر بازخورد قدیمی‌تر. ۰٫۹ یعنی نیمه‌عمر حدود ۷ بازخورد.
DECAY = 0.9
#: فقط این تعداد بازخورد اخیرِ هر دانش‌آموز خوانده می‌شود.
WINDOW = 60
#: کمتر از این تعداد نمونه برای یک درس یا یک ساعت، آماری نیست و نادیده گرفته می‌شود.
MIN_SAMPLES_PER_SUBJECT = 3
MIN_SAMPLES_PER_HOUR = 2
#: امتیاز خنثی؛ ۳ از ۵.
NEUTRAL_RATING = 3.0


class DjangoEfficiencyProfileReader(EfficiencyProfileReader):
    def get(self, student_id: int) -> EfficiencyProfile:
        return self.get_many([student_id]).get(
            student_id, EfficiencyProfile.neutral(student_id),
        )

    def get_many(self, student_ids: Iterable[int]) -> dict[int, EfficiencyProfile]:
        ids = sorted({int(value) for value in student_ids})
        if not ids:
            return {}

        rows_by_student: dict[int, list] = defaultdict(list)
        queryset = (
            m.BlockFeedbackModel.objects
            .filter(user_id__in=ids)
            .order_by('user_id', '-created_at', '-id')
            .values('user_id', 'subject', 'rating', 'start_hour')
        )
        for row in queryset:
            bucket = rows_by_student[row['user_id']]
            if len(bucket) < WINDOW:
                bucket.append(row)

        return {
            student_id: _build_profile(student_id, rows_by_student.get(student_id, []))
            for student_id in ids
        }


def _build_profile(student_id: int, rows: Sequence[dict]) -> EfficiencyProfile:
    if not rows:
        return EfficiencyProfile.neutral(student_id)

    overall = _ewma([row['rating'] for row in rows])

    by_subject_ratings: dict[str, list[int]] = defaultdict(list)
    by_hour_ratings: dict[int, list[int]] = defaultdict(list)
    for row in rows:
        if row['subject']:
            by_subject_ratings[row['subject']].append(row['rating'])
        by_hour_ratings[int(row['start_hour'])].append(row['rating'])

    by_subject = {
        subject: _to_efficiency(_ewma(ratings))
        for subject, ratings in by_subject_ratings.items()
        if len(ratings) >= MIN_SAMPLES_PER_SUBJECT
    }
    hour_scores = {
        hour: _to_unit_score(_ewma(ratings))
        for hour, ratings in by_hour_ratings.items()
        if len(ratings) >= MIN_SAMPLES_PER_HOUR
    }

    return EfficiencyProfile(
        student_id=student_id,
        efficiency=_to_efficiency(overall),
        by_subject=by_subject,
        hour_scores=hour_scores,
        sample_size=len(rows),
    )


def _ewma(ratings: Sequence[int]) -> float:
    """ورودی از جدید به قدیم مرتب است، پس وزن اولین عنصر بیشترین است."""
    weight = 1.0
    total = 0.0
    total_weight = 0.0
    for rating in ratings:
        total += weight * float(rating)
        total_weight += weight
        weight *= DECAY
    return total / total_weight if total_weight else NEUTRAL_RATING


def _to_efficiency(average_rating: float) -> float:
    """۳ ستاره → ۱٫۰، ۵ ستاره → ۱٫۳، ۱ ستاره → ۰٫۷."""
    raw = NEUTRAL_EFFICIENCY + (average_rating - NEUTRAL_RATING) * 0.15
    return max(MIN_EFFICIENCY, min(MAX_EFFICIENCY, raw))


def _to_unit_score(average_rating: float) -> float:
    """امتیاز ۱ تا ۵ به بازه‌ی ۰ تا ۱، برای نیم‌رخ ساعتی."""
    return max(0.0, min(1.0, (average_rating - 1.0) / 4.0))
