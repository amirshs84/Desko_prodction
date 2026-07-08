"""RequestContext — بافت اجرای هر Use-Case.

به‌جای پاس دادن پراکنده‌ی user_id/tenant_id/trace_id به هر متد، آن‌ها را در یک
شیء تغییرناپذیر متمرکز می‌کنیم. این شیء از لایه‌ی interface ساخته و به Service
تزریق می‌شود و تضمین می‌کند هر عملیات «می‌داند برای کدام مستأجر و کاربر اجرا
می‌شود» — پایه‌ی ایزولاسیون Multi-Tenant و ردیابی (tracing).
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class RequestContext:
    tenant_id: UUID
    user_id: UUID
    role: str
    trace_id: str
