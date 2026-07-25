"""پورت مخزن اجراهای برنامه‌ریزی و پیشنهادها."""
from __future__ import annotations

from abc import ABC, abstractmethod

from ..entities.plan_run import PlanProposal, PlanRun


class PlanRunRepository(ABC):
    @abstractmethod
    def add(self, run: PlanRun) -> PlanRun:
        """ثبت اجرا به‌همراه پیشنهادهای همه‌ی دانش‌آموزان (یک تراکنش)."""

    @abstractmethod
    def get(self, run_id: int, *, consultant_id: int) -> PlanRun:
        ...

    @abstractmethod
    def list_for_consultant(self, consultant_id: int, *, limit: int = 50) -> list[PlanRun]:
        ...


class PlanProposalRepository(ABC):
    @abstractmethod
    def get_for_student(self, proposal_id: int, *, student_id: int) -> PlanProposal:
        """پیشنهادِ متعلق به همین دانش‌آموز؛ در غیر این صورت ``NotFoundError``."""

    @abstractmethod
    def list_for_student(
        self, student_id: int, *, pending_only: bool = False,
    ) -> list[PlanProposal]:
        ...

    @abstractmethod
    def save(self, proposal: PlanProposal) -> None:
        """ذخیره‌ی وضعیت پاسخ (پذیرش/رد) — با محافظت در برابر پاسخ همزمان."""
