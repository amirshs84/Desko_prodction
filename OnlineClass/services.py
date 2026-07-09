import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from api.models import ClassEnrollment, School, SchoolClass, UserProfile

from .models import OnlineClass, SkyroomLoginCache
from .skyroom import (
    SkyroomClient,
    SkyroomError,
    build_room_name,
    build_skyroom_user_id,
)

logger = logging.getLogger(__name__)

ACCESS_STUDENT = 1
ACCESS_OPERATOR = 3


class OnlineClassServiceError(Exception):
    def __init__(self, message: str, *, status_code: int = 400):
        self.status_code = status_code
        super().__init__(message)


def _get_client() -> SkyroomClient:
    try:
        return SkyroomClient()
    except SkyroomError as exc:
        raise OnlineClassServiceError(str(exc), status_code=503) from exc


def _login_ttl() -> int:
    return int(getattr(settings, 'SKYROOM_LOGIN_URL_TTL', '3600'))


def get_manager_school_class(school, class_id: int) -> SchoolClass | None:
    return SchoolClass.objects.filter(id=class_id, school=school).first()


def list_manager_online_classes(school):
    return (
        OnlineClass.objects
        .filter(school_class__school=school)
        .select_related('school_class')
        .order_by('-created_at')
    )


def get_manager_online_class(school, online_class_id: int) -> OnlineClass | None:
    return (
        OnlineClass.objects
        .filter(id=online_class_id, school_class__school=school)
        .select_related('school_class')
        .first()
    )


def list_student_online_classes(profile: UserProfile):
    """
    کلاس‌های درسی که دانش‌آموز در آن‌ها عضو است.
    اگر اتاق آنلاین (Skyroom) تخصیص نشده باشد، باز هم در لیست می‌آید
    ولی can_join=False خواهد بود.
    """
    enrollments = (
        ClassEnrollment.objects
        .filter(
            student=profile,
            school_class__is_active=True,
        )
        .select_related('school_class', 'school_class__online_class')
        .order_by('school_class__name', 'school_class__code')
    )

    results = []
    for enrollment in enrollments:
        school_class = enrollment.school_class
        try:
            online = school_class.online_class
        except OnlineClass.DoesNotExist:
            online = None

        has_room = online is not None
        is_online_active = bool(online and online.is_active)
        results.append({
            'id': online.id if online else None,
            'online_class_id': online.id if online else None,
            'school_class_id': school_class.id,
            'school_class_name': school_class.name,
            'school_class_code': school_class.code,
            'grade_display': school_class.get_grade_display() if school_class.grade else '',
            'title': (online.title if online and online.title else school_class.name),
            'is_active': school_class.is_active,
            'has_online_room': has_room,
            'is_online_active': is_online_active,
            'can_join': is_online_active,
        })
    return results


def get_student_online_class(profile: UserProfile, online_class_id: int) -> OnlineClass | None:
    return (
        OnlineClass.objects
        .filter(
            id=online_class_id,
            is_active=True,
            school_class__enrollments__student=profile,
        )
        .select_related('school_class')
        .first()
    )


@transaction.atomic
def assign_online_class_to_school_class(
    *,
    school: School,
    school_class: SchoolClass,
    created_by,
    title: str | None = None,
    max_users: int | None = None,
) -> OnlineClass:
    if OnlineClass.objects.filter(school_class=school_class).exists():
        raise OnlineClassServiceError('این کلاس درسی قبلاً کلاس آنلاین دارد')

    room_name = build_room_name(school.id, school_class.id, school_class.code)
    display_title = (title or school_class.name).strip() or school_class.name

    client = _get_client()

    try:
        existing = client.get_room(name=room_name)
        room_id = int(existing['id'])
    except SkyroomError as exc:
        if exc.error_code != 15:
            raise OnlineClassServiceError(str(exc), status_code=502) from exc
        try:
            room_id = client.create_room(
                name=room_name,
                title=display_title,
                max_users=max_users,
            )
        except SkyroomError as create_exc:
            raise OnlineClassServiceError(str(create_exc), status_code=502) from create_exc

    online_class = OnlineClass.objects.create(
        school_class=school_class,
        skyroom_room_id=room_id,
        skyroom_room_name=room_name,
        title=display_title,
        max_users=max_users,
        created_by=created_by,
    )
    return online_class


def update_online_class(online_class: OnlineClass, **fields) -> OnlineClass:
    allowed = {'title', 'is_active', 'max_users'}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return online_class

    client = _get_client()
    skyroom_updates: dict = {}
    if 'title' in updates:
        skyroom_updates['title'] = updates['title']
    if 'max_users' in updates:
        skyroom_updates['max_users'] = updates['max_users']
    if 'is_active' in updates:
        skyroom_updates['status'] = 1 if updates['is_active'] else 0

    if skyroom_updates:
        try:
            client.update_room(online_class.skyroom_room_id, **skyroom_updates)
        except SkyroomError as exc:
            raise OnlineClassServiceError(str(exc), status_code=502) from exc

    for key, value in updates.items():
        setattr(online_class, key, value)
    online_class.save(update_fields=[*updates.keys(), 'updated_at'])
    return online_class


def delete_online_class(online_class: OnlineClass) -> None:
    online_class.delete()


def _resolve_access(profile: UserProfile, online_class: OnlineClass) -> int:
    if profile.role == 'manager' and profile.school_id == online_class.school_class.school_id:
        return ACCESS_OPERATOR
    return ACCESS_STUDENT


def _nickname_for_profile(profile: UserProfile) -> str:
    return (profile.full_name or profile.phone_number or f'کاربر {profile.user_id}')[:128]


def get_login_url(
    *,
    online_class: OnlineClass,
    profile: UserProfile,
    force_refresh: bool = False,
) -> str:
    if not online_class.is_active:
        raise OnlineClassServiceError('کلاس آنلاین غیرفعال است', status_code=403)

    access = _resolve_access(profile, online_class)
    ttl = _login_ttl()

    if not force_refresh:
        cached = (
            SkyroomLoginCache.objects
            .filter(
                online_class=online_class,
                profile=profile,
                access_level=access,
            )
            .first()
        )
        if cached and cached.is_valid:
            return cached.login_url

    client = _get_client()
    skyroom_uid = build_skyroom_user_id(profile.user_id)
    nickname = _nickname_for_profile(profile)

    try:
        login_url = client.create_login_url(
            room_id=online_class.skyroom_room_id,
            user_id=skyroom_uid,
            nickname=nickname,
            access=access,
            concurrent=1,
            language='fa',
            ttl=ttl,
        )
    except SkyroomError as exc:
        raise OnlineClassServiceError(str(exc), status_code=502) from exc

    expires_at = timezone.now() + timedelta(seconds=ttl)
    SkyroomLoginCache.objects.update_or_create(
        online_class=online_class,
        profile=profile,
        access_level=access,
        defaults={
            'login_url': login_url,
            'expires_at': expires_at,
        },
    )
    return login_url


def student_is_enrolled(profile: UserProfile, online_class: OnlineClass) -> bool:
    return ClassEnrollment.objects.filter(
        school_class=online_class.school_class,
        student=profile,
    ).exists()
