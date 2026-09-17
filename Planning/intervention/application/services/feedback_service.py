"""ثبت بازخورد پایان بلوک و بازخوانی نیم‌رخ بازدهی.

حلقه‌ی بازخورد این‌طور بسته می‌شود: دانش‌آموز با یک کلیک ستاره می‌دهد → اینجا ذخیره
می‌شود → ``EfficiencyProfileReader`` آن را به ضریب بازدهی و نیم‌رخ ساعتی تبدیل
می‌کند → موتور در اجرای بعدی، هم زمان لازم برای «۱۰۰ تست» را تصحیح می‌کند و هم
بلوک‌های سنگین را در ساعت‌هایی می‌گذارد که همین فرد بهتر جواب داده است.

امتیاز روی ``client_id`` بلوک ثبت می‌شود و هر بلوک فقط یک بازخورد دارد؛ ارسال
دوباره، امتیاز قبلی را اصلاح می‌کند نه اینکه رکورد جدید بسازد.
"""
from __future__ import annotations

from typing import Any, Sequence

from ....scheduling.domain.repositories.calendar_event_repository import (
    CalendarEventRepository,
)
from ....scheduling.domain.value_objects.event_ref import EventRef
from ....shared.domain.errors import NotFoundError, ValidationError
from ...domain.ports.efficiency_profile import EfficiencyProfileReader
from ...domain.repositories.block_feedback_repository import (
    MAX_SCORE,
    MIN_SCORE,
    BlockFeedback,
    BlockFeedbackRepository,
)

MAX_ACTUAL_MINUTES = 12 * 60


class FeedbackService:
    def __init__(
        self,
        *,
        feedback: BlockFeedbackRepository,
        events: CalendarEventRepository,
        efficiency: EfficiencyProfileReader | None = None,
    ) -> None:
        self._feedback = feedback
        self._events = events
        self._efficiency = efficiency

    def submit(self, owner_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        client_id = str(payload.get('client_id') or '').strip()
        if not client_id:
            raise ValidationError('شناسه‌ی بلوک الزامی است.')

        event = self._events.get(EventRef(owner_id=owner_id, client_id=client_id))
        if event is None:
            raise NotFoundError('بلوک مورد نظر یافت نشد.', meta={'client_id': client_id})

        record = BlockFeedback(
            user_id=owner_id,
            event_client_id=client_id,
            rating=_score(payload, 'rating'),
            mood=_score(payload, 'mood', default=3),
            subject=event.title[:100],
            planned_minutes=event.slot.duration_minutes,
            actual_minutes=_actual_minutes(payload, event.slot.duration_minutes),
            start_hour=event.slot.start_minutes // 60,
        )
        self._feedback.save(record)
        return {
            'client_id': client_id,
            'rating': record.rating,
            'mood': record.mood,
            'efficiency': self._current_efficiency(owner_id),
        }

    def rated_map(self, owner_id: int, client_ids: Sequence[str]) -> dict[str, bool]:
        rated = self._feedback.rated_client_ids(owner_id, client_ids)
        return {client_id: client_id in rated for client_id in client_ids}

    def summary(self, owner_id: int) -> dict[str, Any]:
        recent = self._feedback.list_recent(owner_id)
        profile = (
            self._efficiency.get(owner_id) if self._efficiency is not None else None
        )
        return {
            'sample_size': len(recent),
            'efficiency': round(profile.efficiency, 3) if profile else 1.0,
            'best_hours': _best_hours(profile),
            'recent': [
                {
                    'client_id': item.event_client_id,
                    'subject': item.subject,
                    'rating': item.rating,
                    'mood': item.mood,
                }
                for item in recent
            ],
        }

    def _current_efficiency(self, owner_id: int) -> float:
        if self._efficiency is None:
            return 1.0
        return round(self._efficiency.get(owner_id).efficiency, 3)


def _score(payload: dict[str, Any], key: str, *, default: int | None = None) -> int:
    raw = payload.get(key, default)
    if raw is None:
        raise ValidationError(f'مقدار «{key}» الزامی است.')
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f'مقدار «{key}» باید عدد باشد.') from exc
    if not MIN_SCORE <= value <= MAX_SCORE:
        raise ValidationError(
            f'امتیاز باید بین {MIN_SCORE} و {MAX_SCORE} باشد.',
            meta={'field': key, 'value': value},
        )
    return value


def _actual_minutes(payload: dict[str, Any], planned: int) -> int:
    raw = payload.get('actual_minutes')
    if raw is None:
        return planned
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError('مدت واقعی باید عدد دقیقه باشد.') from exc
    return max(0, min(MAX_ACTUAL_MINUTES, value))


def _best_hours(profile) -> list[int]:
    """سه ساعتی که این دانش‌آموز در آن‌ها بهترین بازدهی را ثبت کرده."""
    if profile is None or not profile.hour_scores:
        return []
    ranked = sorted(profile.hour_scores.items(), key=lambda pair: (-pair[1], pair[0]))
    return [hour for hour, _ in ranked[:3]]
