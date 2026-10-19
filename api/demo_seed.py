"""ساخت دادهٔ دموی فروش داخل دیتابیس واقعی.

بستهٔ مدرسه یک صحنه است: مدیر، مشاور، کلاس و ده دانش‌آموز با پراکندگی مطالعه.
دکمهٔ دوباره، فقط اکانت‌هایی را عوض می‌کند که خودِ همین بسته ساخته (نام کاربری
`demo-…`). اکانت واقعی و دانش‌آموزی که فقط تیک «دمو» خورده پاک نمی‌شوند.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from Planning.intervention.infrastructure.persistence.models import (
    ConsultantDirectMessageModel,
    ConsultantStudentNoteModel,
)
from Planning.scheduling.domain.enums import EventKind, EventOrigin
from Planning.scheduling.infrastructure.persistence.models import CalendarEventModel

from .jalali_utils import IRAN_TZ, gregorian_to_jalali, iran_today
from .models import (
    ClassEnrollment,
    ConsultantTicket,
    School,
    SchoolClass,
    StudySession,
    Subject,
    UserProfile,
)

DEMO_PASSWORD = 'demo1234'
DEMO_CLASS_CODE = 'DEMO'
HISTORY_DAYS = 28
CALENDAR_DAYS = 14

TIER_EXCELLENT = 'excellent'
TIER_GOOD = 'good'
TIER_AVERAGE = 'average'
TIER_NEEDS = 'needs'
TIER_INACTIVE = 'inactive'

TIER_LABELS = {
    TIER_EXCELLENT: 'عالی',
    TIER_GOOD: 'خوب',
    TIER_AVERAGE: 'متوسط',
    TIER_NEEDS: 'نیاز به بهبود',
    TIER_INACTIVE: 'کم‌فعال',
}

SUBJECTS = (
    ('ریاضی', '#3b82f6', ['specialized', 'analytical'], 3),
    ('فیزیک', '#8b5cf6', ['specialized', 'analytical'], 3),
    ('شیمی', '#10b981', ['specialized', 'analytical'], 2),
    ('ادبیات', '#f59e0b', ['general', 'memorization'], 1),
    ('زیست‌شناسی', '#ec4899', ['specialized', 'memorization'], 2),
)

TOPICS = {
    'ریاضی': ('مشتق', 'انتگرال', 'حد و پیوستگی', 'احتمال'),
    'فیزیک': ('حرکت‌شناسی', 'الکتریسیته', 'نور و موج', 'دینامیک'),
    'شیمی': ('استوکیومتری', 'ترمودینامیک', 'جدول تناوبی', 'اسید و باز'),
    'ادبیات': ('آرایه‌های ادبی', 'نثر معاصر', 'دستور زبان', 'تاریخ ادبیات'),
    'زیست‌شناسی': ('ژنتیک', 'سلول', 'گوارش', 'گردش خون'),
}

# (شروع دقیقه، پایان، عنوان، رنگ، تگ، بار شناختی)
CALENDAR_SLOTS = (
    (15 * 60, 16 * 60 + 30, 'ریاضی', '#3b82f6', ['specialized', 'analytical'], 3),
    (17 * 60, 18 * 60 + 30, 'فیزیک', '#8b5cf6', ['specialized', 'analytical'], 3),
    (19 * 60, 20 * 60 + 15, 'شیمی', '#10b981', ['specialized', 'analytical'], 2),
    (20 * 60 + 30, 21 * 60 + 30, 'مرور ادبیات', '#f59e0b', ['general', 'memorization'], 1),
)

STUDENT_CAST = (
    ('سارا محمدی', TIER_EXCELLENT, 'math'),
    ('امیرحسین رضایی', TIER_EXCELLENT, 'physics'),
    ('نازنین کریمی', TIER_GOOD, 'chemistry'),
    ('پارسا احمدی', TIER_GOOD, 'none'),
    ('زهرا حسینی', TIER_GOOD, 'biology'),
    ('علی مرادی', TIER_AVERAGE, 'math'),
    ('فاطمه نوری', TIER_AVERAGE, 'none'),
    ('محمدجواد اکبری', TIER_AVERAGE, 'computer'),
    ('حدیث قاسمی', TIER_NEEDS, 'none'),
    ('رضا شریفی', TIER_INACTIVE, 'none'),
)


class DemoSeedError(Exception):
    """نام کاربری بستهٔ دمو از قبل به یک اکانت واقعی رسیده است."""


def manager_username(school_id: int) -> str:
    return f'demo-m-{school_id}'


def consultant_username(school_id: int) -> str:
    return f'demo-c-{school_id}'


def student_username(school_id: int, index: int) -> str:
    return f'demo-s-{school_id}-{index:02d}'


def package_usernames(school_id: int) -> list[str]:
    names = [manager_username(school_id), consultant_username(school_id)]
    names.extend(student_username(school_id, i) for i in range(1, len(STUDENT_CAST) + 1))
    return names


def _package_profile_filter(school: School) -> Q:
    student_prefix = f'demo-s-{school.id}-'
    return Q(phone_number=manager_username(school.id)) | Q(
        phone_number=consultant_username(school.id)
    ) | Q(phone_number__startswith=student_prefix)


@transaction.atomic
def seed_school_demo(school: School) -> dict:
    """بستهٔ دمو را می‌سازد. اجرای دوباره، نسخهٔ قبلی همین بسته را جایگزین می‌کند."""
    usernames = package_usernames(school.id)
    _ensure_usernames_available(school, usernames)
    _clear_package(school)
    if SchoolClass.objects.filter(school=school, code=DEMO_CLASS_CODE).exists():
        raise DemoSeedError('کد کلاس DEMO قبلاً در این مدرسه استفاده شده است')

    password_hash = make_password(DEMO_PASSWORD)
    real_manager = UserProfile.objects.filter(school=school, role='manager').first()

    if real_manager is None:
        manager = _create_account(
            username=manager_username(school.id),
            password_hash=password_hash,
            full_name='مدیر دمو',
            role='manager',
            school=school,
        )
        manager_created = True
    else:
        manager = real_manager
        manager_created = False

    consultant = _create_account(
        username=consultant_username(school.id),
        password_hash=password_hash,
        full_name='مشاور دمو',
        role='consultant',
        school=school,
    )

    school_class = SchoolClass.objects.create(
        school=school,
        code=DEMO_CLASS_CODE,
        name='کلاس دوازدهم دمو',
        grade='12',
        is_active=True,
        is_demo=True,
    )

    students = []
    for index, (full_name, tier, olympiad) in enumerate(STUDENT_CAST, start=1):
        profile = _create_account(
            username=student_username(school.id, index),
            password_hash=password_hash,
            full_name=full_name,
            role='student',
            school=school,
            grade='12',
            olympiad=olympiad,
        )
        if index == 1:
            profile.is_studying = True
            profile.save(update_fields=['is_studying'])
        ClassEnrollment.objects.create(school_class=school_class, student=profile)
        _fill_student(profile.user, tier)
        students.append(profile)

    _seed_conversations(school, consultant, students)

    school.is_demo = True
    school.save(update_fields=['is_demo'])

    return {
        'message': 'بسته دمو فروش ساخته شد',
        'password': DEMO_PASSWORD,
        'school_id': school.id,
        'manager': {
            'username': manager.phone_number,
            'full_name': manager.full_name or manager.phone_number,
            'created': manager_created,
        },
        'consultant': {
            'username': consultant.phone_number,
            'full_name': consultant.full_name,
        },
        'class_name': school_class.name,
        'students': [
            {
                'username': profile.phone_number,
                'full_name': profile.full_name,
                'tier_label': TIER_LABELS[STUDENT_CAST[i][1]],
            }
            for i, profile in enumerate(students)
        ],
    }


@transaction.atomic
def seed_student_demo_activity(profile: UserProfile) -> None:
    """درس، ساعت مطالعه و تقویم یک دانش‌آموز را پر می‌کند.

    دادهٔ قبلی همان دانش‌آموز در این سه بخش جایگزین می‌شود.
    """
    profile.is_demo = True
    profile.is_profile_complete = True
    profile.save(update_fields=['is_demo', 'is_profile_complete'])
    _fill_student(profile.user, TIER_EXCELLENT)

    demo_class = SchoolClass.objects.filter(school=profile.school, is_demo=True).first()
    if demo_class is not None:
        ClassEnrollment.objects.get_or_create(school_class=demo_class, student=profile)


def _ensure_usernames_available(school: School, usernames: list[str]) -> None:
    blocked = []
    occupants = User.objects.filter(username__in=usernames).select_related('profile')
    for user in occupants:
        profile = getattr(user, 'profile', None)
        owned = (
            profile is not None
            and profile.is_demo
            and profile.school_id == school.id
            and _is_package_username(school.id, profile.phone_number)
        )
        if not owned:
            blocked.append(user.username)

    foreign_phones = UserProfile.objects.filter(phone_number__in=usernames).exclude(
        school=school,
        is_demo=True,
    )
    for profile in foreign_phones:
        if profile.phone_number not in blocked:
            blocked.append(profile.phone_number)

    if blocked:
        joined = '، '.join(blocked)
        raise DemoSeedError(
            f'این نام‌های کاربری قبلاً برای اکانت دیگری استفاده شده‌اند: {joined}'
        )


def _is_package_username(school_id: int, username: str) -> bool:
    if username in (manager_username(school_id), consultant_username(school_id)):
        return True
    prefix = f'demo-s-{school_id}-'
    if not username.startswith(prefix):
        return False
    suffix = username[len(prefix):]
    return suffix.isdigit()


def _clear_package(school: School) -> None:
    SchoolClass.objects.filter(school=school, is_demo=True).delete()
    user_ids = list(
        UserProfile.objects.filter(school=school, is_demo=True)
        .filter(_package_profile_filter(school))
        .values_list('user_id', flat=True)
    )
    if user_ids:
        User.objects.filter(id__in=user_ids).delete()


def _create_account(
    *,
    username: str,
    password_hash: str,
    full_name: str,
    role: str,
    school: School,
    grade: str = '',
    olympiad: str = '',
) -> UserProfile:
    user = User.objects.create(username=username, password=password_hash)
    return UserProfile.objects.create(
        user=user,
        phone_number=username,
        full_name=full_name,
        grade=grade,
        olympiad_field=olympiad,
        school=school,
        role=role,
        is_profile_complete=True,
        is_password_set=True,
        is_demo=True,
    )


def _fill_student(user: User, tier: str) -> None:
    StudySession.objects.filter(user=user).delete()
    CalendarEventModel.objects.filter(user=user).delete()
    Subject.objects.filter(user=user).delete()

    subjects = [
        Subject.objects.create(user=user, name=name, color_code=color)
        for name, color, _tags, _load in SUBJECTS
    ]
    by_name = {subject.name: subject for subject in subjects}

    sessions = []
    events = []
    today = iran_today()
    modes = (
        StudySession.MODE_STUDY,
        StudySession.MODE_TEST,
        StudySession.MODE_REVIEW,
        StudySession.MODE_SOLVE,
    )

    for day_offset in range(HISTORY_DAYS):
        day = today - timedelta(days=day_offset)
        chunks = _session_chunks(_seconds_for_day(tier, day_offset, day.weekday()))
        for chunk_index, seconds in enumerate(chunks):
            subject = subjects[(day_offset + chunk_index) % len(subjects)]
            start = _aware(day, 15 if chunk_index == 0 else 18, 0 if chunk_index == 0 else 30)
            mode = modes[(day_offset + chunk_index) % len(modes)]
            topic = TOPICS[subject.name][(day_offset + chunk_index) % len(TOPICS[subject.name])]
            sessions.append(StudySession(
                user=user,
                subject=subject,
                description=topic,
                start_time=start,
                end_time=start + timedelta(seconds=seconds),
                duration_seconds=seconds,
                is_valid=True,
                mode=mode,
                count_test=max(8, seconds // 180) if mode == StudySession.MODE_TEST else None,
            ))

    for ahead in range(CALENDAR_DAYS):
        day = today + timedelta(days=ahead)
        weekday = day.weekday()
        slot_index = 0
        if weekday in (0, 5):
            events.append(_calendar_event(
                user, day, slot_index,
                start_minutes=7 * 60 + 30,
                end_minutes=9 * 60,
                title='کلاس مدرسه',
                color='#6366f1',
                tags=['specialized'],
                cognitive_load=2,
                kind=EventKind.IMMUTABLE.value,
                origin=EventOrigin.SCHOOL.value,
                movability=0,
            ))
            slot_index += 1
        for start, end, title, color, tags, load in _slots_for_tier(tier, ahead):
            subject_name = title.split()[0] if title.split()[0] in by_name else title
            topics = TOPICS.get(subject_name, ('مرور',))
            topic = topics[ahead % len(topics)]
            events.append(_calendar_event(
                user, day, slot_index,
                start_minutes=start,
                end_minutes=end,
                title=f'{title} — {topic}' if subject_name in TOPICS else title,
                color=color,
                tags=tags,
                cognitive_load=load,
                kind=EventKind.MUTABLE.value,
                origin=EventOrigin.CONSULTANT.value,
                movability=2,
            ))
            slot_index += 1

    StudySession.objects.bulk_create(sessions)
    CalendarEventModel.objects.bulk_create(events)


def _seconds_for_day(tier: str, day_offset: int, weekday: int) -> int:
    """مدت مطالعهٔ یک روز. جمع ۷+۱ روز اخیر باید داخل سطل عملکرد همان سطح بماند."""
    friday = weekday == 4
    if tier == TIER_INACTIVE:
        if day_offset < 10:
            return 0
        return 1800 if day_offset % 4 == 0 else 0
    if tier == TIER_NEEDS:
        if day_offset == 0 or day_offset > 7:
            return 0 if day_offset == 0 else (3600 if not friday else 0)
        return 3000 if day_offset % 2 == 0 else 0
    if tier == TIER_AVERAGE:
        return 0 if friday else 6000
    if tier == TIER_GOOD:
        return 3600 if friday else 11500
    return 5400 if friday else 18000


def _session_chunks(total: int) -> list[int]:
    if total <= 0:
        return []
    if total <= 5400:
        return [total]
    first = int(total * 0.6)
    return [first, total - first]


def _slots_for_tier(tier: str, day_offset: int):
    if tier == TIER_INACTIVE:
        return CALENDAR_SLOTS[:1] if day_offset % 3 == 0 else ()
    if tier == TIER_NEEDS:
        return CALENDAR_SLOTS[:2]
    if tier == TIER_AVERAGE:
        return CALENDAR_SLOTS[:3]
    return CALENDAR_SLOTS


def _calendar_event(
    user, day, slot_index, *, start_minutes, end_minutes, title, color, tags,
    cognitive_load, kind, origin, movability,
) -> CalendarEventModel:
    jy, jm, jd = gregorian_to_jalali(day.year, day.month, day.day)
    return CalendarEventModel(
        user=user,
        client_id=f'demo-{day.isoformat()}-{slot_index}',
        jy=jy,
        jm=jm,
        jd=jd,
        date=day,
        title=title,
        description='',
        start_minutes=start_minutes,
        end_minutes=end_minutes,
        color=color,
        all_day=False,
        kind=kind,
        origin=origin,
        group_id='',
        version=1,
        priority=3,
        movability=movability,
        subject_tags=tags,
        cognitive_load=cognitive_load,
    )


def _aware(day, hour: int, minute: int = 0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)), IRAN_TZ)


def _seed_conversations(school: School, consultant: UserProfile, students: list[UserProfile]) -> None:
    notes = (
        (0, 'سارا برنامه را منظم اجرا می‌کند. این هفته روی تست زمان‌دار تمرکز کند.'),
        (4, 'زهرا در شیمی خوب پیش می‌رود ولی فیزیک را عقب انداخته است.'),
        (8, 'حدیث دو هفته است که به برنامه پایبند نیست. فردا تماس گرفته شود.'),
    )
    for index, body in notes:
        ConsultantStudentNoteModel.objects.create(
            school=school,
            consultant=consultant.user,
            student=students[index].user,
            body=body,
        )

    threads = (
        (1, (
            (ConsultantDirectMessageModel.SENDER_CONSULTANT, 'امیرحسین، گزارش امروزت را دیدم. فیزیک را خوب جمع کردی.'),
            (ConsultantDirectMessageModel.SENDER_STUDENT, 'ممنون. برای فردا تست حرکت‌شناسی را تمام می‌کنم.'),
        )),
        (8, (
            (ConsultantDirectMessageModel.SENDER_STUDENT, 'این هفته نرسیدم درس بخوانم. برنامه را سبک‌تر می‌کنید؟'),
            (ConsultantDirectMessageModel.SENDER_CONSULTANT, 'باشه. فردا فقط دو بلوک ریاضی و یک مرور ادبیات بگذار.'),
        )),
    )
    for index, messages in threads:
        for sender, body in messages:
            ConsultantDirectMessageModel.objects.create(
                school=school,
                consultant=consultant.user,
                student=students[index].user,
                sender_role=sender,
                body=body,
            )

    ConsultantTicket.objects.create(
        user=students[1].user,
        ticket_type='consultant',
        message='برنامه عصرها با کلاس زبان تداخل دارد. می‌شود بلوک فیزیک جابه‌جا شود؟',
        reply='بلوک فیزیک را به بعد از شام منتقل کردم. تقویم فردا را ببین.',
        replied_by=consultant.user,
        replied_at=timezone.now(),
        is_resolved=True,
    )
    ConsultantTicket.objects.create(
        user=students[6].user,
        ticket_type='consultant',
        message='برای آزمون هفته بعد، اولویت با ریاضی باشد یا شیمی؟',
    )
    ConsultantTicket.objects.create(
        user=students[8].user,
        ticket_type='consultant',
        message='چند روز است تمرکز ندارم و ساعت مطالعه‌ام خیلی کم شده.',
    )
