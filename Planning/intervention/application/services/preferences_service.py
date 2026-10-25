"""ترجیحات شخصی‌سازی مشاور."""
from __future__ import annotations

import uuid
from typing import Any

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.repositories.preferences_repository import PreferencesRepository
from ..dto.roster_dto import ROSTER_COLUMNS

MAX_QUICK_REPLIES = 12
MAX_REPLY_LEN = 500
ALLOWED_COLUMN_KEYS = frozenset(
    col.key for col in ROSTER_COLUMNS if col.key != 'full_name'
)
DEFAULT_VISIBLE_COLUMNS = [
    'performance',
    'study_seconds',
    'session_count',
    'grade',
    'class_names',
    'tags',
    'groups',
]
DEFAULT_NOTIFICATIONS = {
    'direct_messages': True,
    'plan_responses': True,
    'dashboard_alerts': True,
}
DEFAULT_WORKING_HOURS = {
    'timezone': 'Asia/Tehran',
    'start': '09:00',
    'end': '18:00',
    'days': ['sat', 'sun', 'mon', 'tue', 'wed'],
}
DEFAULT_SMART_ALERTS = {
    'missed_report': True,
    'study_drop': True,
    'study_drop_percent': 20,
}
DEFAULT_RESERVE = 3
MIN_RESERVE_SLOTS = 1
MAX_RESERVE_SLOTS = 4
MIN_DROP_PERCENT = 5
MAX_DROP_PERCENT = 50
WEEK_DAYS = frozenset({'sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'})


class PreferencesService:
    def __init__(
        self,
        *,
        preferences: PreferencesRepository,
        directory: SchoolDirectory,
    ) -> None:
        self._preferences = preferences
        self._directory = directory

    def get(self, *, context: RequestContext) -> dict[str, Any]:
        school_id = _require_consultant(context)
        raw = self._preferences.get_or_create(
            consultant_id=context.actor_user_id, school_id=school_id,
        )
        return self._to_payload(context=context, school_id=school_id, raw=raw)

    def update(self, *, context: RequestContext, patch: dict[str, Any]) -> dict[str, Any]:
        school_id = _require_consultant(context)
        current = self._preferences.get_or_create(
            consultant_id=context.actor_user_id, school_id=school_id,
        )

        quick_replies = current['quick_replies']
        visible = current['visible_roster_columns']
        notifications = current['notifications']
        working_hours = current['working_hours']
        on_leave = bool(current.get('on_leave'))
        reserve_slots = int(current.get('reserve_slots') or DEFAULT_RESERVE)
        smart_alerts = _normalize_smart_alerts(current.get('smart_alerts') or {})

        if 'quick_replies' in patch:
            quick_replies = _normalize_quick_replies(patch['quick_replies'])
        if 'visible_roster_columns' in patch:
            visible = _normalize_columns(patch['visible_roster_columns'])
        if 'notifications' in patch:
            notifications = _normalize_notifications(patch['notifications'])
        if 'working_hours' in patch:
            working_hours = _normalize_working_hours(patch['working_hours'])
        if 'on_leave' in patch:
            on_leave = _as_bool(patch['on_leave'], label='وضعیت مرخصی')
        if 'reserve_slots' in patch:
            reserve_slots = _normalize_reserve(patch['reserve_slots'])
        if 'smart_alerts' in patch:
            smart_alerts = _normalize_smart_alerts(patch['smart_alerts'])

        saved = self._preferences.save(
            consultant_id=context.actor_user_id,
            school_id=school_id,
            quick_replies=quick_replies,
            visible_roster_columns=visible,
            notifications=notifications,
            working_hours=working_hours,
            on_leave=on_leave,
            reserve_slots=reserve_slots,
            smart_alerts=smart_alerts,
        )
        return self._to_payload(context=context, school_id=school_id, raw=saved)

    def _to_payload(
        self, *, context: RequestContext, school_id: int, raw: dict[str, Any],
    ) -> dict[str, Any]:
        consultant = self._directory.get_consultant(
            context.actor_user_id, school_id=school_id,
        )
        school_name = self._directory.get_school_name(school_id)
        visible = raw['visible_roster_columns'] or list(DEFAULT_VISIBLE_COLUMNS)
        notifications = {**DEFAULT_NOTIFICATIONS, **(raw['notifications'] or {})}
        working = {**DEFAULT_WORKING_HOURS, **(raw['working_hours'] or {})}
        if not working.get('days'):
            working['days'] = list(DEFAULT_WORKING_HOURS['days'])
        alerts = {**DEFAULT_SMART_ALERTS, **(raw.get('smart_alerts') or {})}

        return {
            'identity': {
                'user_id': context.actor_user_id,
                'full_name': consultant.full_name if consultant else '',
                'phone_number': consultant.phone_number if consultant else '',
                'role': 'consultant',
                'school_id': school_id,
                'school_name': school_name,
            },
            'quick_replies': raw['quick_replies'] or [],
            'visible_roster_columns': visible,
            'available_roster_columns': [
                {'key': col.key, 'label': col.label, 'placeholder': col.placeholder}
                for col in ROSTER_COLUMNS
                if col.key != 'full_name'
            ],
            'notifications': notifications,
            'working_hours': working,
            'on_leave': bool(raw.get('on_leave')),
            'reserve_slots': int(raw.get('reserve_slots') or DEFAULT_RESERVE),
            'smart_alerts': {
                'missed_report': bool(alerts.get('missed_report')),
                'study_drop': bool(alerts.get('study_drop')),
                'study_drop_percent': int(
                    alerts.get('study_drop_percent') or DEFAULT_SMART_ALERTS['study_drop_percent']
                ),
            },
            'support': {
                'can_create_ticket': True,
                'ticket_type': 'support',
                'note': 'پیام شما برای پشتیبانی محصول ارسال می‌شود.',
            },
        }


def _normalize_quick_replies(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        raise ValidationError('فرمت پاسخ‌های سریع نامعتبر است.')
    if len(value) > MAX_QUICK_REPLIES:
        raise ValidationError(
            f'حداکثر {MAX_QUICK_REPLIES} پاسخ سریع مجاز است.',
            meta={'limit': MAX_QUICK_REPLIES},
        )
    result: list[dict[str, str]] = []
    for item in value:
        if isinstance(item, str):
            body = item.strip()
            title = body[:24] or 'پاسخ'
            reply_id = str(uuid.uuid4())
        elif isinstance(item, dict):
            body = str(item.get('body') or '').strip()
            title = str(item.get('title') or '').strip() or (body[:24] or 'پاسخ')
            reply_id = str(item.get('id') or uuid.uuid4())
        else:
            continue
        if not body:
            raise ValidationError('متن پاسخ سریع نمی‌تواند خالی باشد.')
        if len(body) > MAX_REPLY_LEN:
            raise ValidationError(
                f'متن پاسخ سریع نباید بیش از {MAX_REPLY_LEN} نویسه باشد.',
            )
        result.append({'id': reply_id, 'title': title[:40], 'body': body})
    return result


def _normalize_columns(value: Any) -> list[str]:
    if not isinstance(value, list):
        raise ValidationError('فرمت ستون‌های جدول نامعتبر است.')
    cleaned: list[str] = []
    for key in value:
        key = str(key).strip()
        if key == 'full_name':
            continue
        if key not in ALLOWED_COLUMN_KEYS:
            raise ValidationError(
                'ستون نامعتبر است.',
                meta={'key': key, 'allowed': sorted(ALLOWED_COLUMN_KEYS)},
            )
        if key not in cleaned:
            cleaned.append(key)
    if not cleaned:
        raise ValidationError('حداقل یک ستون باید انتخاب شود.')
    return cleaned


def _normalize_notifications(value: Any) -> dict[str, bool]:
    if not isinstance(value, dict):
        raise ValidationError('فرمت نوتیفیکیشن‌ها نامعتبر است.')
    result = dict(DEFAULT_NOTIFICATIONS)
    for key in DEFAULT_NOTIFICATIONS:
        if key in value:
            result[key] = bool(value[key])
    return result


def _normalize_working_hours(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError('فرمت ساعات کاری نامعتبر است.')
    start = str(value.get('start') or DEFAULT_WORKING_HOURS['start']).strip()
    end = str(value.get('end') or DEFAULT_WORKING_HOURS['end']).strip()
    if not _valid_hhmm(start) or not _valid_hhmm(end):
        raise ValidationError('ساعت باید به صورت HH:MM باشد.')
    days_raw = value.get('days') or DEFAULT_WORKING_HOURS['days']
    if not isinstance(days_raw, list):
        raise ValidationError('روزهای کاری نامعتبر است.')
    days = [d for d in days_raw if str(d) in WEEK_DAYS]
    if not days:
        raise ValidationError('حداقل یک روز کاری لازم است.')
    return {
        'timezone': 'Asia/Tehran',
        'start': start,
        'end': end,
        'days': days,
    }


def _as_bool(value: Any, *, label: str) -> bool:
    if isinstance(value, bool):
        return value
    raise ValidationError(f'{label} باید درست یا نادرست باشد.')


def _normalize_reserve(value: Any) -> int:
    try:
        count = int(value)
    except (TypeError, ValueError):
        raise ValidationError('تعداد نوبت خالی نامعتبر است.') from None
    if count < MIN_RESERVE_SLOTS or count > MAX_RESERVE_SLOTS:
        raise ValidationError(
            f'تعداد نوبت خالی باید بین {MIN_RESERVE_SLOTS} و {MAX_RESERVE_SLOTS} باشد.',
        )
    return count


def _normalize_smart_alerts(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError('فرمت هشدارهای هوشمند نامعتبر است.')
    result = dict(DEFAULT_SMART_ALERTS)
    if 'missed_report' in value:
        result['missed_report'] = _as_bool(value['missed_report'], label='هشدار گزارش')
    if 'study_drop' in value:
        result['study_drop'] = _as_bool(value['study_drop'], label='هشدار افت مطالعه')
    if 'study_drop_percent' in value:
        try:
            percent = int(value['study_drop_percent'])
        except (TypeError, ValueError):
            raise ValidationError('آستانه‌ی افت مطالعه نامعتبر است.') from None
        if percent < MIN_DROP_PERCENT or percent > MAX_DROP_PERCENT:
            raise ValidationError(
                f'آستانه‌ی افت مطالعه باید بین {MIN_DROP_PERCENT} و {MAX_DROP_PERCENT} باشد.',
            )
        result['study_drop_percent'] = percent
    return result


def _valid_hhmm(value: str) -> bool:
    parts = value.split(':')
    if len(parts) != 2:
        return False
    try:
        hour, minute = int(parts[0]), int(parts[1])
    except ValueError:
        return False
    return 0 <= hour <= 23 and 0 <= minute <= 59


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('ترجیحات فقط برای نقش مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
