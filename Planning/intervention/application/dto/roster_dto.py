"""DTO غنی‌شده‌ی فهرست دانش‌آموزان مشاور (Roster CRM)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ....shared.application.ports.school_directory import StudentInfo


@dataclass(frozen=True)
class RosterMetricsDTO:
    """متریک‌های وابسته به بازه زمانی (روزانه/هفتگی/ماهانه)."""

    study_seconds: int = 0
    session_count: int = 0
    # فعلاً دیتای آزمون نداریم؛ null یعنی ستون placeholder
    test_count: int | None = None
    last_exam_status: str | None = None
    # ۰ تا ۱ برای طیف سبز→قرمز در UI
    performance: float = 0.0


@dataclass(frozen=True)
class RosterRowDTO:
    student: StudentInfo
    groups: tuple[tuple[int, str], ...] = ()
    metrics: RosterMetricsDTO = field(default_factory=RosterMetricsDTO)
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class RosterColumnDTO:
    key: str
    label: str
    type: str  # text | duration | number | heatmap | tags | groups
    metric: bool = False
    placeholder: bool = False


@dataclass(frozen=True)
class RosterPageDTO:
    period: str
    columns: tuple[RosterColumnDTO, ...]
    rows: tuple[RosterRowDTO, ...]


# ستون‌های پویا — افزودن ستون جدید فقط این لیست (+ پر کردن در سرویس) را می‌خواهد.
ROSTER_COLUMNS: tuple[RosterColumnDTO, ...] = (
    RosterColumnDTO('full_name', 'نام', 'text'),
    RosterColumnDTO('performance', 'وضعیت', 'heatmap', metric=True),
    RosterColumnDTO('study_seconds', 'زمان مطالعه', 'duration', metric=True),
    RosterColumnDTO('session_count', 'جلسات', 'number', metric=True),
    RosterColumnDTO('test_count', 'تعداد تست', 'number', metric=True, placeholder=True),
    RosterColumnDTO('last_exam_status', 'آخرین آزمون', 'text', metric=True, placeholder=True),
    RosterColumnDTO('grade', 'پایه', 'text'),
    RosterColumnDTO('class_names', 'کلاس‌ها', 'text'),
    RosterColumnDTO('tags', 'برچسب‌ها', 'tags'),
    RosterColumnDTO('groups', 'گروه‌های من', 'groups'),
)


def performance_score(study_seconds: int, *, period: str) -> float:
    """نرمال‌سازی مطالعه به بازه ۰..۱ بر اساس آستانه‌های عمل‌گرای بازه."""
    hours = max(0.0, study_seconds / 3600.0)
    if period == 'daily':
        thresholds = (0.5, 1.0, 2.0, 3.0)
    elif period == 'monthly':
        thresholds = (10.0, 20.0, 40.0, 60.0)
    else:  # weekly
        thresholds = (3.0, 7.0, 14.0, 20.0)

    if hours <= 0:
        return 0.0
    if hours >= thresholds[-1]:
        return 1.0
    prev = 0.0
    for index, limit in enumerate(thresholds):
        if hours <= limit:
            span = limit - prev
            ratio = (hours - prev) / span if span else 1.0
            return (index + ratio) / len(thresholds)
        prev = limit
    return 1.0


def build_tags(student: StudentInfo) -> tuple[str, ...]:
    tags: list[str] = []
    field = (student.olympiad_field or '').strip()
    if field:
        tags.append(field if field.startswith('#') else f'#{field}')
    if student.grade in ('11', '12'):
        tags.append('#کنکوری')
    return tuple(dict.fromkeys(tags))


def metrics_values(metrics: RosterMetricsDTO) -> dict[str, Any]:
    return {
        'study_seconds': metrics.study_seconds,
        'session_count': metrics.session_count,
        'test_count': metrics.test_count,
        'last_exam_status': metrics.last_exam_status,
        'performance': round(metrics.performance, 3),
    }
