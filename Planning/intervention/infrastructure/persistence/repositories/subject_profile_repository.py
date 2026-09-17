"""پیاده‌سازی Django مخزن کاتالوگ درس."""
from __future__ import annotations

from ....domain.repositories.subject_profile_repository import SubjectProfileRepository
from ....domain.value_objects.subject_profile import SubjectProfile
from .. import models as m
from ..mappers import SubjectProfileMapper


class DjangoSubjectProfileRepository(SubjectProfileRepository):
    def list_for_school(self, school_id: int) -> tuple[SubjectProfile, ...]:
        return tuple(
            SubjectProfileMapper.to_entity(row)
            for row in m.SubjectProfileModel.objects.filter(school_id=school_id)
        )

    def save(
        self, *, school_id: int, profile: SubjectProfile, baseline_units_per_hour: int = 0,
    ) -> SubjectProfile:
        m.SubjectProfileModel.objects.update_or_create(
            school_id=school_id,
            name=profile.name,
            defaults={
                'tags': list(profile.tag_values),
                'cognitive_load': profile.cognitive_load,
                'default_priority': profile.default_priority,
                'default_movability': profile.default_movability,
                'baseline_units_per_hour': max(0, int(baseline_units_per_hour)),
            },
        )
        return profile

    def delete(self, *, school_id: int, name: str) -> bool:
        deleted, _ = m.SubjectProfileModel.objects.filter(
            school_id=school_id, name=name,
        ).delete()
        return bool(deleted)
