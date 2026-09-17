"""مدیریت کاتالوگ درس مدرسه توسط مشاور.

تگ درس («عمومی/اختصاصی» و «تحلیلی/حفظی») یک‌بار اینجا تعیین می‌شود و بعد همه‌ی
برنامه‌ها از آن ارث می‌برند: طول بلوک، استراحت بعدش، و قید «دو بلوک سنگین پشت سر
هم نباشند» همگی از همین چند تگ تغذیه می‌شوند.
"""
from __future__ import annotations

from typing import Any

from ....shared.application.context import RequestContext
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import (
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from ...domain.enums import (
    MAX_MOVABILITY,
    MAX_PRIORITY,
    MIN_MOVABILITY,
    MIN_PRIORITY,
)
from ...domain.repositories.subject_profile_repository import SubjectProfileRepository
from ...domain.value_objects.intensity_profile import IntensityProfile
from ...domain.value_objects.subject_profile import SubjectProfile
from ...domain.value_objects.subject_tag import (
    MAX_COGNITIVE_LOAD,
    MIN_COGNITIVE_LOAD,
    SubjectTag,
    parse_tags,
)
from ...domain.enums import IntensityLevel

MAX_BASELINE_UNITS_PER_HOUR = 600


class SubjectCatalogService:
    def __init__(self, *, profiles: SubjectProfileRepository) -> None:
        self._profiles = profiles

    def list(self, *, context: RequestContext) -> dict[str, Any]:
        school_id = _require_consultant(context)
        return {
            'subjects': [
                _to_payload(profile)
                for profile in self._profiles.list_for_school(school_id)
            ],
            'available_tags': [
                {'value': tag.value, 'label': tag.label} for tag in SubjectTag
            ],
            'intensity_preview': _intensity_preview(),
        }

    def upsert(self, *, context: RequestContext, payload: dict[str, Any]) -> dict[str, Any]:
        school_id = _require_consultant(context)
        profile = SubjectProfile(
            name=str(payload.get('name') or ''),
            tags=parse_tags(payload.get('tags')),
            cognitive_load=_bounded(
                payload.get('cognitive_load'), MIN_COGNITIVE_LOAD, MAX_COGNITIVE_LOAD, 0,
            ),
            default_priority=_bounded(
                payload.get('default_priority'), MIN_PRIORITY, MAX_PRIORITY, 3,
            ),
            default_movability=_bounded(
                payload.get('default_movability'), MIN_MOVABILITY, MAX_MOVABILITY, 2,
            ),
        )
        saved = self._profiles.save(
            school_id=school_id,
            profile=profile,
            baseline_units_per_hour=_bounded(
                payload.get('baseline_units_per_hour'), 0, MAX_BASELINE_UNITS_PER_HOUR, 0,
            ),
        )
        return _to_payload(saved)

    def delete(self, *, context: RequestContext, name: str) -> None:
        school_id = _require_consultant(context)
        if not self._profiles.delete(school_id=school_id, name=(name or '').strip()):
            raise NotFoundError('این درس در کاتالوگ مدرسه نیست.', meta={'name': name})


def _to_payload(profile: SubjectProfile) -> dict[str, Any]:
    return {
        'name': profile.name,
        'tags': list(profile.tag_values),
        'cognitive_load': profile.cognitive_load,
        'default_priority': profile.default_priority,
        'default_movability': profile.default_movability,
        'is_analytical': profile.is_analytical,
        'is_memorization': profile.is_memorization,
    }


def _intensity_preview() -> dict[str, Any]:
    """نمایش «هر سطح فشردگی برای هر تگ چه طول بلوکی می‌سازد» در UI مشاور."""
    preview: dict[str, Any] = {}
    for level in IntensityLevel:
        profile = IntensityProfile.for_level(level)
        shapes = {'default': profile.default_shape}
        for tag in (SubjectTag.ANALYTICAL, SubjectTag.MEMORIZATION):
            shapes[tag.value] = profile.shape_for(frozenset({tag}))
        preview[level.value] = {
            key: {
                'study_minutes': shape.study_minutes,
                'break_minutes': shape.break_minutes,
                'min_block_minutes': shape.min_block_minutes,
            }
            for key, shape in shapes.items()
        }
    return preview


def _bounded(value: Any, low: int, high: int, fallback: int) -> int:
    if value is None or value == '':
        return fallback
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError) as exc:
        raise ValidationError('مقدار عددی نامعتبر است.') from exc


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('کاتالوگ درس فقط برای نقش مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
