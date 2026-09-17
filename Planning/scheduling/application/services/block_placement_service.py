"""Use-case های تقویم مشاور: جای‌گذاری بلوک، جابه‌جایی با snap، و گزارش فضای خالی.

چرا جدا از ``CalendarService``؟ چون قواعد اینجا اضافه‌اند و نباید به مسیر فعلی
تقویم دانش‌آموز تحمیل شوند: تداخل ممنوع است، پنجره‌ی بیداری اجباری است و سرور
اجازه دارد نقطه‌ی درخواستی را اصلاح کند. رویدادهای قدیمی و ویرایش‌های فرم‌محور
همچنان از مسیر قبلی می‌روند و رفتارشان تغییری نکرده است.

تصمیم آگاهانه: «مرجع نهایی جای بلوک، سرور است». UI می‌تواند خوش‌بینانه بلوک را
بکشد، اما جای واقعی همان چیزی است که این سرویس برمی‌گرداند؛ به این ترتیب قاعده‌ی
چیدمان فقط یک‌بار و در یک زبان نوشته می‌شود.
"""
from __future__ import annotations

from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.errors import (
    ConcurrencyConflictError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from ...domain.entities.calendar_event import DEFAULT_EVENT_COLOR, CalendarEvent
from ...domain.entities.day_agenda import DayAgenda
from ...domain.enums import EventKind
from ...domain.repositories.awake_window_repository import AwakeWindowRepository
from ...domain.repositories.block_template_repository import BlockTemplateRepository
from ...domain.repositories.calendar_event_repository import CalendarEventRepository
from ...domain.services.awake_window_policy import AwakeWindowPolicy
from ...domain.value_objects.block_template import (
    BLOCK_TEMPLATES,
    BlockTemplate,
    ensure_valid_duration,
    get_template,
)
from ...domain.value_objects.event_ref import EventRef
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange
from ..commands.block_commands import MoveBlockCommand, PlaceBlockCommand
from ..dto.placement_dto import DayAvailabilityDTO, PlacementResultDTO
from ..ports.id_generator import IdGenerator


class BlockPlacementService:
    def __init__(
        self,
        *,
        events: CalendarEventRepository,
        ids: IdGenerator,
        uow_factory: Callable[[], UnitOfWork],
        templates: BlockTemplateRepository | None = None,
        policy: AwakeWindowPolicy | None = None,
        windows: AwakeWindowRepository | None = None,
    ) -> None:
        self._events = events
        self._ids = ids
        self._uow_factory = uow_factory
        self._templates = templates
        self._windows = windows
        self._default_policy = policy or AwakeWindowPolicy.default()

    def _policy_for(self, owner_id: int) -> AwakeWindowPolicy:
        """بازه‌ی فعالِ همین دانش‌آموز؛ در نبود مخزن، پیش‌فرض سیستم."""
        if self._windows is None:
            return self._default_policy
        return self._windows.get(owner_id)

    # ---------- خواندن ----------

    def list_templates(self, owner_id: int | None = None) -> tuple[BlockTemplate, ...]:
        custom = self._templates.list_for_owner(owner_id) if (
            self._templates is not None and owner_id is not None
        ) else ()
        return BLOCK_TEMPLATES + custom

    def resolve_template(self, key: str, *, owner_id: int) -> BlockTemplate:
        """کاتالوگ سیستم، وگرنه قالب ذخیره‌شده‌ی همین مشاور."""
        try:
            return get_template(key)
        except NotFoundError:
            pass
        if self._templates is None:
            raise NotFoundError(
                'الگوی بلوک مورد نظر وجود ندارد.',
                meta={'key': key},
            )
        custom = self._templates.get_for_owner(owner_id, key)
        if custom is None:
            raise NotFoundError(
                'الگوی بلوک مورد نظر وجود ندارد.',
                meta={'key': key},
            )
        return custom

    def create_template(
        self,
        owner_id: int,
        *,
        title: str,
        duration_minutes: int,
        color: str = '',
    ) -> BlockTemplate:
        if self._templates is None:
            raise ValidationError('ذخیره‌ی بلوک آماده در دسترس نیست.')
        cleaned = (title or '').strip()
        if not cleaned:
            raise ValidationError('عنوان بلوک الزامی است.')
        ensure_valid_duration(duration_minutes)
        template = BlockTemplate(
            key=f'custom_{self._ids.new_id()[:12]}',
            title=cleaned[:100],
            duration_minutes=duration_minutes,
            color=(color or '#10b981').strip() or '#10b981',
        )
        with self._uow_factory():
            return self._templates.save(owner_id, template)

    def update_template(
        self,
        owner_id: int,
        key: str,
        *,
        title: str | None = None,
        duration_minutes: int | None = None,
        color: str | None = None,
    ) -> BlockTemplate:
        if self._templates is None:
            raise ValidationError('ذخیره‌ی بلوک آماده در دسترس نیست.')
        existing = self._templates.get_for_owner(owner_id, key)
        if existing is None:
            raise NotFoundError('بلوک آماده‌ی مورد نظر یافت نشد.', meta={'key': key})
        next_title = (title.strip() if title is not None else existing.title)
        if not next_title:
            raise ValidationError('عنوان بلوک الزامی است.')
        next_duration = (
            duration_minutes if duration_minutes is not None else existing.duration_minutes
        )
        ensure_valid_duration(next_duration)
        next_color = (
            color.strip() if color is not None and color.strip() else existing.color
        )
        updated = BlockTemplate(
            key=existing.key,
            title=next_title[:100],
            duration_minutes=next_duration,
            color=next_color,
        )
        with self._uow_factory():
            return self._templates.save(owner_id, updated)

    def delete_template(self, owner_id: int, key: str) -> None:
        if self._templates is None:
            raise ValidationError('ذخیره‌ی بلوک آماده در دسترس نیست.')
        # قالب‌های سیستم قابل حذف نیستند
        try:
            get_template(key)
        except NotFoundError:
            pass
        else:
            raise ValidationError(
                'بلوک‌های پیش‌فرض سیستم قابل حذف نیستند.',
                meta={'key': key},
            )
        with self._uow_factory():
            deleted = self._templates.delete_for_owner(owner_id, key)
        if not deleted:
            raise NotFoundError('بلوک آماده‌ی مورد نظر یافت نشد.', meta={'key': key})

    def day_availability(
        self, owner_id: int, date: JalaliDate, *, min_duration: int = 1,
    ) -> DayAvailabilityDTO:
        agenda = self._agenda(owner_id, date)
        free = tuple(agenda.free_slots(min_duration=min_duration))
        free_minutes = sum(slot.duration_minutes for slot in free)
        return DayAvailabilityDTO(
            date=date,
            window=agenda.policy.window,
            free_slots=free,
            busy_slots=tuple(agenda.busy_ranges()),
            free_minutes=free_minutes,
            busy_minutes=agenda.policy.capacity_minutes - agenda.free_minutes(),
            largest_free_minutes=max((slot.duration_minutes for slot in free), default=0),
        )

    # ---------- نوشتن ----------

    def place_block(
        self, command: PlaceBlockCommand, *, context: RequestContext,
    ) -> PlacementResultDTO:
        ensure_valid_duration(command.duration_minutes)
        agenda = self._agenda(command.owner_id, command.date)
        slot = self._resolve_slot(
            agenda,
            duration_minutes=command.duration_minutes,
            preferred_start=command.preferred_start_minutes,
            snap=command.snap,
        )
        event = CalendarEvent.create(
            ref=EventRef(
                owner_id=command.owner_id,
                client_id=command.client_id or self._ids.new_id(),
            ),
            date=command.date,
            slot=slot,
            title=command.title,
            description=command.description,
            color=command.color or DEFAULT_EVENT_COLOR,
            group_id=command.group_id,
            kind=EventKind.MUTABLE,
            authority=context.authority,
        )
        with self._uow_factory():
            self._events.add_many([event])
        return PlacementResultDTO(
            event=event,
            requested_start_minutes=command.preferred_start_minutes,
            snapped=command.preferred_start_minutes not in (None, slot.start_minutes),
        )

    def move_block(
        self, command: MoveBlockCommand, *, context: RequestContext,
    ) -> PlacementResultDTO:
        ref = EventRef(owner_id=command.owner_id, client_id=command.client_id)
        event = self._events.get(ref)
        # قفل رویداد ثابت پیش از هر محاسبه‌ای بررسی می‌شود تا پیام خطا دقیق بماند.
        event.ensure_writable_by(context.authority)
        if command.expected_version is not None and command.expected_version != event.version:
            raise ConcurrencyConflictError(
                meta={'client_id': command.client_id, 'current_version': event.version},
            )
        if event.all_day:
            raise ValidationError(
                'رویداد تمام‌روز ساعت ندارد؛ برای تغییر تاریخ آن از ویرایش معمولی استفاده کنید.',
                meta={'client_id': command.client_id},
            )

        target_date = command.date or event.date
        preferred_start = (
            command.start_minutes if command.start_minutes is not None
            else event.slot.start_minutes
        )
        agenda = self._agenda(command.owner_id, target_date)
        slot = self._resolve_slot(
            agenda,
            duration_minutes=event.slot.duration_minutes,
            preferred_start=preferred_start,
            snap=command.snap,
            exclude_client_id=event.client_id,
        )

        with self._uow_factory():
            event.move_to(target_date, slot, authority=context.authority)
            self._events.save(event)
        return PlacementResultDTO(
            event=event,
            requested_start_minutes=preferred_start,
            snapped=preferred_start != slot.start_minutes,
        )

    # ---------- کمکی ----------

    def _agenda(self, owner_id: int, date: JalaliDate) -> DayAgenda:
        events = self._events.list_for_owner(owner_id, date_from=date, date_to=date)
        return DayAgenda.build(owner_id, date, events, policy=self._policy_for(owner_id))

    def _resolve_slot(
        self,
        agenda: DayAgenda,
        *,
        duration_minutes: int,
        preferred_start: int | None,
        snap: bool,
        exclude_client_id: str | None = None,
    ) -> TimeRange:
        if snap or preferred_start is None:
            return agenda.find_slot(
                duration_minutes,
                preferred_start=preferred_start,
                exclude_client_id=exclude_client_id,
            )

        # حالت «دقیقاً همین‌جا»: هر مانعی خطاست، چون کاربر صریحاً snap را خاموش کرده.
        agenda.policy.ensure_fits(preferred_start, duration_minutes)
        slot = TimeRange.of_duration(preferred_start, duration_minutes)
        clashes = agenda.conflicts(slot, exclude_client_id=exclude_client_id)
        if clashes:
            raise ConflictError(
                'این بازه با رویداد دیگری تداخل دارد.',
                meta={
                    'conflicts': [
                        {
                            'client_id': other.client_id,
                            'title': other.title,
                            'start_minutes': other.slot.start_minutes,
                            'end_minutes': other.slot.end_minutes,
                            'kind': other.kind.value,
                        }
                        for other in clashes
                    ],
                },
            )
        return slot
