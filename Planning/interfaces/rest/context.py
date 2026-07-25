"""ساخت RequestContext از درخواست HTTP و کنترل دسترسی به تقویم دیگران.

اینجا مرز بین «دنیای HTTP/Django» و «دنیای use-case ها» است: نقش کاربر به اختیار
نوشتن (``WriteAuthority``) ترجمه می‌شود و مالک تقویم هدف تعیین و اعتبارسنجی می‌گردد.
سرویس‌ها بعد از این مرز، فقط با شناسه‌های تأییدشده کار می‌کنند.
"""
from __future__ import annotations

from api.models import UserProfile

from ...shared.application.context import RequestContext
from ...shared.domain.enums import WriteAuthority
from ...shared.domain.errors import PermissionDeniedError, SchoolMismatchError

_AUTHORITY_BY_ROLE = {
    'student': WriteAuthority.STUDENT,
    'consultant': WriteAuthority.CONSULTANT,
    'manager': WriteAuthority.SCHOOL_MANAGER,
}


def build_context(request) -> RequestContext:
    profile = getattr(request.user, 'profile', None)
    if profile is None:
        raise PermissionDeniedError('پروفایل کاربری یافت نشد.')
    authority = _AUTHORITY_BY_ROLE.get(profile.role)
    if authority is None:
        raise PermissionDeniedError('نقش کاربری شما برای این عملیات مجاز نیست.')
    return RequestContext(
        actor_user_id=request.user.id,
        authority=authority,
        school_id=profile.school_id,
        trace_id=request.headers.get('X-Request-Id', ''),
    )


def resolve_calendar_owner(request, target_user_id: int | None) -> int:
    """مالک تقویمی که درخواست روی آن اثر می‌گذارد.

    قاعده‌ها:
      - نبودن ``target_user_id`` یعنی «تقویم خودم».
      - دانش‌آموز فقط به تقویم خودش دسترسی دارد.
      - مشاور و مدیر به تقویم دانش‌آموزان مدرسه‌ی خودشان دسترسی دارند.
    """
    actor_profile = getattr(request.user, 'profile', None)
    if actor_profile is None:
        raise PermissionDeniedError('پروفایل کاربری یافت نشد.')
    if target_user_id is None or target_user_id == request.user.id:
        return request.user.id

    if actor_profile.role not in ('consultant', 'manager'):
        raise PermissionDeniedError('شما اجازه‌ی دیدن تقویم کاربر دیگری را ندارید.')
    if actor_profile.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')

    target = UserProfile.objects.filter(user_id=target_user_id, role='student').first()
    if target is None or target.school_id != actor_profile.school_id:
        raise SchoolMismatchError()
    return target_user_id
