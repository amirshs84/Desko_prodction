"""آداپتور کاتالوگ درس روی ``SubjectProfileModel``."""
from __future__ import annotations

from typing import Sequence

from ...domain.ports.subject_catalog import SubjectCatalog
from ...domain.value_objects.subject_profile import SubjectProfile
from ..persistence import models as m
from ..persistence.mappers import SubjectProfileMapper


class DjangoSubjectCatalog(SubjectCatalog):
    def profiles_for(
        self, *, school_id: int | None, names: Sequence[str],
    ) -> dict[str, SubjectProfile]:
        wanted = [str(name).strip() for name in names if str(name).strip()]
        if not wanted:
            return {}
        rows = (
            m.SubjectProfileModel.objects.filter(school_id=school_id, name__in=wanted)
            if school_id is not None
            else m.SubjectProfileModel.objects.none()
        )
        found = {row.name: SubjectProfileMapper.to_entity(row) for row in rows}
        return {name: found.get(name) or SubjectProfile.fallback(name) for name in wanted}
