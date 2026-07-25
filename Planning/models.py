"""نقطه‌ی کشف مدل‌ها توسط Django.

طبق Clean Architecture، تعریف مدل‌ها در لایه‌ی
``<context>/infrastructure/persistence/models.py`` است. Django به‌صورت خودکار فقط
``<app>/models.py`` را import می‌کند؛ بنابراین اینجا آن‌ها را بازصادر می‌کنیم تا در
رجیستری اپ ``Planning`` ثبت و migration بگیرند، بدون آنکه منطق دامنه به این ماژول
نشت کند.
"""
from .intervention.infrastructure.persistence.models import (
    PlanProposalModel,
    PlanRunModel,
    StudentGroupMemberModel,
    StudentGroupModel,
)
from .scheduling.infrastructure.persistence.models import (
    CalendarEventModel,
    CalendarSnapshotModel,
)

__all__ = [
    'CalendarEventModel',
    'CalendarSnapshotModel',
    'PlanProposalModel',
    'PlanRunModel',
    'StudentGroupMemberModel',
    'StudentGroupModel',
]
