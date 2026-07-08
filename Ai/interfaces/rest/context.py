"""ساخت RequestContext از درخواست DRF.

این تنها نقطه‌ی «پل» میان پلتفرم (کاربر/مدرسه با کلید صحیح در اپ‌های iam/api) و
دامنه‌ی AI (که با UUID و واژگان UserRole کار می‌کند) است. با تمرکز این نگاشت در
یک ماژول، بقیه‌ی کد AI از جزئیات احراز هویت پلتفرم مستقل می‌ماند.

نگاشت هویت: شناسه‌های صحیح کاربر/مدرسه به‌صورت قطعی (uuid5) به UUID تبدیل می‌شوند
تا در کل عمر سیستم پایدار بمانند (همان کاربر → همان UUID).
"""
from __future__ import annotations

import uuid

from ...shared.application.context import RequestContext

# namespace ثابت برای تولید UUID قطعی از کلیدهای صحیح پلتفرم.
_NS = uuid.UUID("6f9619ff-8b86-d011-b42d-00c04fc964ff")

_ROLE_KEYWORDS = (
    ("manager", "manager"),
    ("teacher", "teacher"),
    ("consultant", "consultant"),
    ("student", "student"),
)


def platform_user_uuid(user_id: int) -> uuid.UUID:
    return uuid.uuid5(_NS, f"user:{user_id}")


def platform_tenant_uuid(school_id: int | None) -> uuid.UUID:
    # نبودِ مدرسه → مستأجر پیش‌فرض (مثلاً کاربران سیستمی).
    return uuid.uuid5(_NS, f"school:{school_id if school_id is not None else 0}")


def _resolve_school_id(user) -> int | None:
    profile = getattr(user, "profile", None)
    return getattr(profile, "school_id", None)


def _resolve_role(user) -> str:
    """نقش پلتفرم را به یکی از UserRoleهای AI نگاشت می‌کند (پیش‌فرض student)."""
    codename = ""
    try:
        from api.models import RoleAssignment

        qs = RoleAssignment.objects.filter(user=user)
        # فقط انتساب‌های فعال، اگر چنین فیلدی وجود داشته باشد.
        if any(f.name == "is_active" for f in RoleAssignment._meta.get_fields()):
            qs = qs.filter(is_active=True)
        assignment = qs.select_related("role").first()
        if assignment is not None:
            codename = (assignment.role.codename or "").lower()
    except Exception:  # noqa: BLE001 — نبود جدول/رابطه نباید درخواست را بشکند
        codename = ""

    for keyword, role_value in _ROLE_KEYWORDS:
        if keyword in codename:
            return role_value
    return "student"


def build_request_context(request) -> RequestContext:
    user = request.user
    school_id = _resolve_school_id(user)
    trace_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    return RequestContext(
        tenant_id=platform_tenant_uuid(school_id),
        user_id=platform_user_uuid(user.id),
        role=_resolve_role(user),
        trace_id=trace_id,
    )
