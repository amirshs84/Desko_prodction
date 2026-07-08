"""پیاده‌سازی RolePromptProfileRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from ....domain.entities.role_prompt_profile import RolePromptProfile
from ....domain.enums import UserRole
from ....domain.repositories.role_prompt_profile_repository import (
    RolePromptProfileRepository,
)
from ..mappers import RolePromptProfileMapper
from ..models import RolePromptProfileModel


class DjangoRolePromptProfileRepository(RolePromptProfileRepository):
    def resolve(
        self, *, role: UserRole, tenant_id: UUID
    ) -> RolePromptProfile | None:
        # اولویت ۱: override فعالِ مختص مستأجر (جدیدترین نسخه).
        row = (
            RolePromptProfileModel.objects.filter(
                role=role.value, tenant_id=tenant_id, is_active=True
            )
            .order_by("-version")
            .first()
        )
        if row is None:
            # اولویت ۲: پیش‌فرض سراسری (tenant_id = NULL).
            row = (
                RolePromptProfileModel.objects.filter(
                    role=role.value, tenant_id__isnull=True, is_active=True
                )
                .order_by("-version")
                .first()
            )
        return RolePromptProfileMapper.to_entity(row) if row else None

    def get(self, profile_id: UUID) -> RolePromptProfile | None:
        row = RolePromptProfileModel.objects.filter(id=profile_id).first()
        return RolePromptProfileMapper.to_entity(row) if row else None

    def save(self, profile: RolePromptProfile) -> None:
        row = RolePromptProfileModel.objects.filter(id=profile.id).first()
        if row is None:
            row = RolePromptProfileModel(id=profile.id)
            RolePromptProfileMapper.apply_to_row(profile, row)
            row.save(force_insert=True)
        else:
            RolePromptProfileMapper.apply_to_row(profile, row)
            row.save()
