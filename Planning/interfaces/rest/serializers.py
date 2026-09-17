"""اعتبارسنجی ورودی و شکل‌دهی خروجی HTTP.

اینجا فقط «قرارداد سیم» است: نام فیلدها، نوع‌ها و مقادیر پیش‌فرض. هیچ قاعده‌ی
کسب‌وکاری اینجا نیست (آن‌ها در دامنه‌اند) و هیچ ORM ای هم دیده نمی‌شود.

نام فیلدها عیناً همان قرارداد فعلی فرانت‌اند است تا تقویم دانش‌آموز نشکند؛ فیلدهای
تازه (``kind``/``origin``/``version``) فقط اضافه شده‌اند و کلاینت قدیمی آن‌ها را
نادیده می‌گیرد.
"""
from __future__ import annotations

from rest_framework import serializers
from rest_framework.fields import DateTimeField

from ...intervention.domain.enums import (
    ActivityKind,
    DemandUnit,
    IntensityLevel,
    MAX_MOVABILITY,
    MAX_PRIORITY,
    MIN_MOVABILITY,
    MIN_PRIORITY,
    PlanMode,
)
from ...intervention.domain.value_objects.subject_tag import SubjectTag
from ...scheduling.domain.entities.calendar_event import DEFAULT_EVENT_COLOR, CalendarEvent
from ...scheduling.domain.value_objects.jalali_date import JalaliDate
from ...scheduling.domain.value_objects.time_range import MINUTES_IN_DAY

_datetime_field = DateTimeField()


def event_to_dict(event: CalendarEvent) -> dict:
    return {
        'client_id': event.client_id,
        'group_id': event.group_id,
        'jy': event.date.jy,
        'jm': event.date.jm,
        'jd': event.date.jd,
        'title': event.title,
        'description': event.description,
        'start_minutes': event.slot.start_minutes,
        'end_minutes': event.slot.end_minutes,
        'color': event.color,
        'all_day': event.all_day,
        'kind': event.kind.value,
        'origin': event.origin.value,
        'version': event.version,
        'priority': event.priority,
        'movability': event.movability,
        'subject_tags': list(event.subject_tags),
        'cognitive_load': event.cognitive_load,
        'created_at': _datetime_field.to_representation(event.created_at) if event.created_at else None,
    }


class CalendarEventCreateSerializer(serializers.Serializer):
    """ورودی ساخت رویداد؛ ``client_id`` را کلاینت می‌سازد تا عملیات idempotent شود."""

    client_id = serializers.CharField(max_length=64)
    group_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    jy = serializers.IntegerField()
    jm = serializers.IntegerField()
    jd = serializers.IntegerField()
    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    start_minutes = serializers.IntegerField(required=False, default=0)
    end_minutes = serializers.IntegerField(required=False, default=MINUTES_IN_DAY)
    color = serializers.CharField(max_length=20, required=False, default=DEFAULT_EVENT_COLOR)
    all_day = serializers.BooleanField(required=False, default=False)


class CalendarEventPatchSerializer(serializers.Serializer):
    """ویرایش جزئی یک رویداد (شامل جابه‌جایی تاریخ)."""

    jy = serializers.IntegerField(required=False)
    jm = serializers.IntegerField(required=False)
    jd = serializers.IntegerField(required=False)
    title = serializers.CharField(max_length=300, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_minutes = serializers.IntegerField(required=False)
    end_minutes = serializers.IntegerField(required=False)
    color = serializers.CharField(max_length=20, required=False)
    all_day = serializers.BooleanField(required=False)


class CalendarEventGroupPatchSerializer(serializers.Serializer):
    """فیلدهای مشترک قابل ویرایش برای کل یک گروه (تاریخ‌ها تغییر نمی‌کنند)."""

    title = serializers.CharField(max_length=300, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_minutes = serializers.IntegerField(required=False)
    end_minutes = serializers.IntegerField(required=False)
    color = serializers.CharField(max_length=20, required=False)
    all_day = serializers.BooleanField(required=False)


class JalaliDateSerializer(serializers.Serializer):
    jy = serializers.IntegerField()
    jm = serializers.IntegerField()
    jd = serializers.IntegerField()

    def to_value_object(self, data: dict) -> JalaliDate:
        return JalaliDate(data['jy'], data['jm'], data['jd'])


class WeeklyRecurrenceSerializer(serializers.Serializer):
    """تکرار هفتگی: روزهای هفته (شنبه=۰) در بازه‌ی [from, to]."""

    weekdays = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        allow_empty=False,
    )
    start = JalaliDateSerializer()
    end = JalaliDateSerializer()


class ClassFixedEventCreateSerializer(serializers.Serializer):
    """ورودی ساخت رویداد ثابت کلاس توسط مدیر مدرسه."""

    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    color = serializers.CharField(max_length=20, required=False, default=DEFAULT_EVENT_COLOR)
    start_minutes = serializers.IntegerField(min_value=0, max_value=MINUTES_IN_DAY)
    end_minutes = serializers.IntegerField(min_value=0, max_value=MINUTES_IN_DAY)
    dates = JalaliDateSerializer(many=True, required=False)
    recurrence = WeeklyRecurrenceSerializer(required=False)

    def validate(self, attrs):
        if bool(attrs.get('dates')) == bool(attrs.get('recurrence')):
            raise serializers.ValidationError(
                'باید دقیقاً یکی از «dates» یا «recurrence» ارسال شود.'
            )
        return attrs


class PlaceBlockSerializer(serializers.Serializer):
    """گذاشتن بلوک روی تقویم؛ یا با ``template`` یا با ``duration_minutes`` + ``title``."""

    date = serializers.CharField()
    template = serializers.CharField(max_length=40, required=False, allow_blank=True, default='')
    title = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    duration_minutes = serializers.IntegerField(required=False)
    start_minutes = serializers.IntegerField(required=False, min_value=0)
    color = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    description = serializers.CharField(required=False, allow_blank=True, default='')
    group_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    client_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    snap = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not attrs.get('template') and not attrs.get('duration_minutes'):
            raise serializers.ValidationError(
                'یا الگوی بلوک را انتخاب کنید یا طول آن را بفرستید.'
            )
        return attrs


class MoveBlockSerializer(serializers.Serializer):
    """جابه‌جایی رویداد موجود؛ دست‌کم یکی از ``date`` یا ``start_minutes`` لازم است."""

    date = serializers.CharField(required=False, allow_blank=True, default='')
    start_minutes = serializers.IntegerField(required=False, min_value=0)
    snap = serializers.BooleanField(required=False, default=True)
    expected_version = serializers.IntegerField(required=False, min_value=1)


def time_range_to_dict(slot) -> dict:
    return {
        'start_minutes': slot.start_minutes,
        'end_minutes': slot.end_minutes,
        'duration_minutes': slot.duration_minutes,
    }


def block_template_to_dict(template, *, editable: bool = False) -> dict:
    return {
        'key': template.key,
        'title': template.title,
        'duration_minutes': template.duration_minutes,
        'color': template.color,
        'editable': editable,
        'source': 'custom' if editable else 'system',
    }


class BlockTemplateWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100)
    duration_minutes = serializers.IntegerField(min_value=5, max_value=480)
    color = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')


class BlockTemplatePatchSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100, required=False)
    duration_minutes = serializers.IntegerField(min_value=5, max_value=480, required=False)
    color = serializers.CharField(max_length=20, required=False, allow_blank=True)


def placement_to_dict(result) -> dict:
    return {
        'event': event_to_dict(result.event),
        'snapped': result.snapped,
        'requested_start_minutes': result.requested_start_minutes,
    }


def availability_to_dict(availability) -> dict:
    return {
        'date': {
            'jy': availability.date.jy,
            'jm': availability.date.jm,
            'jd': availability.date.jd,
        },
        'window': time_range_to_dict(availability.window),
        'free_slots': [time_range_to_dict(slot) for slot in availability.free_slots],
        'busy_slots': [time_range_to_dict(slot) for slot in availability.busy_slots],
        'free_minutes': availability.free_minutes,
        'busy_minutes': availability.busy_minutes,
        'largest_free_minutes': availability.largest_free_minutes,
    }


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )


class GroupUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class GroupMembersSerializer(serializers.Serializer):
    """یا ``member_ids`` (فهرست نهایی) یا ترکیب ``add``/``remove``."""

    member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False,
    )
    add = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )
    remove = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )


def student_to_dict(student) -> dict:
    return {
        'user_id': student.user_id,
        'full_name': student.full_name,
        'phone_number': student.phone_number,
        'grade': student.grade,
        'olympiad_field': getattr(student, 'olympiad_field', '') or '',
        'class_names': list(student.class_names),
    }


class NoteCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)


class NoteUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)


class DirectMessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=4000)


class StudentReplyMessageSerializer(serializers.Serializer):
    consultant_id = serializers.IntegerField(min_value=1)
    body = serializers.CharField(max_length=4000)


def note_to_dict(note) -> dict:
    return {
        'id': note.id,
        'student_id': note.student_id,
        'body': note.body,
        'created_at': _datetime_field.to_representation(note.created_at) if note.created_at else None,
        'updated_at': _datetime_field.to_representation(note.updated_at) if note.updated_at else None,
    }


def direct_message_to_dict(message) -> dict:
    return {
        'id': message.id,
        'consultant_id': message.consultant_id,
        'student_id': message.student_id,
        'sender_role': message.sender_role,
        'body': message.body,
        'created_at': _datetime_field.to_representation(message.created_at) if message.created_at else None,
    }


def group_to_dict(group) -> dict:
    return {
        'id': group.id,
        'name': group.name,
        'description': group.description,
        'member_count': group.member_count,
        'members': [student_to_dict(member) for member in group.members],
        'created_at': _datetime_field.to_representation(group.created_at) if group.created_at else None,
    }


def roster_entry_to_dict(entry) -> dict:
    """سازگاری عقب‌رو با کلاینت‌های قدیمی (آرایه‌ی تخت دانش‌آموزان)."""
    metrics = getattr(entry, 'metrics', None)
    base = {
        **student_to_dict(entry.student),
        'groups': [{'id': group_id, 'name': name} for group_id, name in entry.groups],
        'tags': list(getattr(entry, 'tags', ()) or ()),
    }
    if metrics is not None:
        from ...intervention.application.dto.roster_dto import metrics_values
        base.update(metrics_values(metrics))
    return base


def roster_page_to_dict(page) -> dict:
    """پاسخ غنی Roster با ستون‌های پویا برای جدول مشاور."""
    return {
        'period': page.period,
        'columns': [
            {
                'key': column.key,
                'label': column.label,
                'type': column.type,
                'metric': column.metric,
                'placeholder': column.placeholder,
            }
            for column in page.columns
        ],
        'students': [roster_entry_to_dict(row) for row in page.rows],
    }


class SubjectQuotaSerializer(serializers.Serializer):
    """سهمیه‌ی صریح یک درس بر حسب دقیقه (قرارداد قدیمی، هنوز پشتیبانی می‌شود)."""

    subject = serializers.CharField(max_length=100)
    minutes = serializers.IntegerField(min_value=1)
    priority = serializers.IntegerField(
        required=False, allow_null=True, min_value=MIN_PRIORITY, max_value=MAX_PRIORITY,
    )
    movability = serializers.IntegerField(
        required=False, allow_null=True, min_value=MIN_MOVABILITY, max_value=MAX_MOVABILITY,
    )


class SubjectDemandSerializer(serializers.Serializer):
    """تقاضای یک درس: یا دقیقه، یا تعداد (مثلاً «۱۰۰ تست ریاضی»).

    در حالت ``count`` موتور با نرخ واقعی همان دانش‌آموز زمان لازم را تخمین می‌زند؛
    پس یک درخواست واحد برای دو دانش‌آموز می‌تواند دو حجم زمانی متفاوت بسازد.
    """

    subject = serializers.CharField(max_length=100)
    amount = serializers.IntegerField(min_value=1)
    unit = serializers.ChoiceField(
        choices=[unit.value for unit in DemandUnit],
        required=False, default=DemandUnit.MINUTES.value,
    )
    activity = serializers.ChoiceField(
        choices=[kind.value for kind in ActivityKind],
        required=False, default=ActivityKind.STUDY.value,
    )
    priority = serializers.IntegerField(
        required=False, allow_null=True, min_value=MIN_PRIORITY, max_value=MAX_PRIORITY,
    )
    movability = serializers.IntegerField(
        required=False, allow_null=True, min_value=MIN_MOVABILITY, max_value=MAX_MOVABILITY,
    )


class PlanBuildSerializer(serializers.Serializer):
    """ورودی مشترک پیش‌نمایش و انتشار برنامه‌ی گروهی.

    مخاطب: ``group_id`` یا ``student_ids``. تقاضا دقیقاً یکی از سه شکل زیر:
      • ``demands`` — تقاضای هر درس بر حسب دقیقه یا تعداد (قرارداد جدید)
      • ``quotas`` — سهمیه‌ی صریح هر درس بر حسب دقیقه (قرارداد قدیمی)
      • ``subjects`` + ``total_minutes`` که با ``ratios`` وزن‌دهی می‌شود
    """

    group_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    student_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )
    start = serializers.CharField()
    end = serializers.CharField()
    intensity = serializers.ChoiceField(
        choices=[level.value for level in IntensityLevel],
        required=False, default=IntensityLevel.NORMAL.value,
    )
    demands = SubjectDemandSerializer(many=True, required=False, default=list)
    quotas = SubjectQuotaSerializer(many=True, required=False, default=list)
    subjects = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, default=list,
    )
    total_minutes = serializers.IntegerField(required=False, min_value=1)
    ratios = serializers.DictField(
        child=serializers.FloatField(min_value=0), required=False, default=dict,
    )
    mode = serializers.ChoiceField(
        choices=[mode.value for mode in PlanMode],
        required=False, default=PlanMode.SUGGESTED.value,
    )
    color = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    goal_message = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=500,
    )

    def validate(self, attrs):
        if bool(attrs.get('group_id')) == bool(attrs.get('student_ids')):
            raise serializers.ValidationError(
                'دقیقاً یکی از «group_id» یا «student_ids» را بفرستید.'
            )
        provided = [
            key for key in ('demands', 'quotas', 'subjects') if attrs.get(key)
        ]
        if len(provided) != 1:
            raise serializers.ValidationError(
                'دقیقاً یکی از «demands»، «quotas» یا «subjects» را بفرستید.'
            )
        if attrs.get('subjects') and not attrs.get('total_minutes'):
            raise serializers.ValidationError('«total_minutes» برای این حالت الزامی است.')
        return attrs


class AwakeWindowSerializer(serializers.Serializer):
    """بازه‌ی فعال شبانه‌روز دانش‌آموز، بر حسب دقیقه از نیمه‌شب."""

    start_minutes = serializers.IntegerField(min_value=0, max_value=1439)
    end_minutes = serializers.IntegerField(min_value=1, max_value=1440)


class SubjectProfileWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    tags = serializers.ListField(
        child=serializers.ChoiceField(choices=[tag.value for tag in SubjectTag]),
        required=False, default=list,
    )
    cognitive_load = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=3,
    )
    default_priority = serializers.IntegerField(
        required=False, min_value=MIN_PRIORITY, max_value=MAX_PRIORITY, default=3,
    )
    default_movability = serializers.IntegerField(
        required=False, min_value=MIN_MOVABILITY, max_value=MAX_MOVABILITY, default=2,
    )
    baseline_units_per_hour = serializers.IntegerField(
        required=False, min_value=0, max_value=600, default=0,
    )


class BlockFeedbackSerializer(serializers.Serializer):
    """امتیاز پایان بلوک: ۱ تا ۵ برای بازدهی و ۱ تا ۵ برای حال و انرژی."""

    client_id = serializers.CharField(max_length=64)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    mood = serializers.IntegerField(required=False, min_value=1, max_value=5, default=3)
    actual_minutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=720,
    )


class ProposalRespondSerializer(serializers.Serializer):
    accept = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, default='', max_length=2000)


class ProposalBlockRespondSerializer(serializers.Serializer):
    block_index = serializers.IntegerField(min_value=0)
    accept = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, default='', max_length=2000)


class ApplyBlockItemSerializer(serializers.Serializer):
    jy = serializers.IntegerField()
    jm = serializers.IntegerField()
    jd = serializers.IntegerField()
    start_minutes = serializers.IntegerField(min_value=0, max_value=1439)
    end_minutes = serializers.IntegerField(min_value=1, max_value=1440)
    subject = serializers.CharField(max_length=100)
    color = serializers.CharField(max_length=20, required=False, allow_blank=True, default='#10b981')


class ApplyStudentBlocksSerializer(serializers.Serializer):
    blocks = ApplyBlockItemSerializer(many=True, allow_empty=False)
    take_snapshot = serializers.BooleanField(required=False, default=True)


def planned_block_to_dict(block) -> dict:
    return {
        'jy': block.date.jy,
        'jm': block.date.jm,
        'jd': block.date.jd,
        'subject': block.subject,
        'start_minutes': block.slot.start_minutes,
        'end_minutes': block.slot.end_minutes,
        'duration_minutes': block.minutes,
        'color': block.color,
        'priority': block.priority,
        'movability': block.movability,
        'activity': block.activity.value,
        'tags': list(block.tag_values),
        'cognitive_load': block.cognitive_load,
    }


def _relocation_to_dict(move) -> dict:
    return {
        'client_id': move.client_id,
        'subject': move.subject,
        'jy': move.date.jy,
        'jm': move.date.jm,
        'jd': move.date.jd,
        'start_minutes': move.slot.start_minutes,
        'end_minutes': move.slot.end_minutes,
        'from': {
            'jy': move.from_date.jy,
            'jm': move.from_date.jm,
            'jd': move.from_date.jd,
            'start_minutes': move.from_slot.start_minutes,
            'end_minutes': move.from_slot.end_minutes,
        },
    }


def _window_to_dict(window) -> dict:
    return {
        'start': {'jy': window.start.jy, 'jm': window.start.jm, 'jd': window.start.jd},
        'end': {'jy': window.end.jy, 'jm': window.end.jm, 'jd': window.end.jd},
        'length_days': window.length_days,
    }


def _warning_to_dict(warning) -> dict:
    return {'code': warning.code, 'message': warning.message, 'meta': warning.meta}


def plan_draft_to_dict(draft, student_name: str = '') -> dict:
    return {
        'student_id': draft.student_id,
        'student_name': student_name,
        'blocks': [planned_block_to_dict(block) for block in draft.blocks],
        'quotas': [
            {
                'subject': quota.subject,
                'minutes': quota.minutes,
                'priority': quota.priority,
                'movability': quota.movability,
                'activity': quota.activity.value,
                'tags': sorted(tag.value for tag in quota.tags),
                'cognitive_load': quota.cognitive_load,
                'requested_units': quota.requested_units,
                'estimate_confidence': round(quota.estimate_confidence, 2),
            }
            for quota in draft.quotas
        ],
        'allocated_by_subject': dict(draft.allocated_by_subject),
        'required_minutes': draft.required_minutes,
        'allocated_minutes': draft.allocated_minutes,
        'capacity_minutes': draft.capacity_minutes,
        'shortfall_minutes': draft.shortfall_minutes,
        'has_deadlock': draft.has_deadlock,
        'warnings': [_warning_to_dict(warning) for warning in draft.warnings],
        'relocations': [_relocation_to_dict(move) for move in draft.relocations],
    }


def plan_preview_to_dict(dto) -> dict:
    preview = dto.preview
    return {
        'window': _window_to_dict(preview.window),
        'intensity': preview.intensity.value,
        'total_blocks': preview.total_blocks,
        'has_deadlock': preview.has_deadlock,
        'blocked_student_ids': [draft.student_id for draft in preview.blocked_students],
        'students': [
            plan_draft_to_dict(draft, dto.student_name(draft.student_id))
            for draft in preview.drafts
        ],
    }


def plan_run_to_dict(dto) -> dict:
    run = dto.run
    return {
        'id': run.id,
        'mode': run.mode.value,
        'intensity': run.intensity.value,
        'group_id': run.group_id,
        'group_tag': run.group_tag,
        'window': _window_to_dict(run.window),
        'summary': run.summary,
        'student_count': run.student_count,
        'created_events': dto.created_events,
        'moved_events': dto.moved_events,
        'snapshots_taken': dto.snapshots_taken,
        'created_at': _datetime_field.to_representation(run.created_at) if run.created_at else None,
        'proposals': [
            {
                'id': proposal.id,
                'student_id': proposal.student_id,
                'student_name': dto.student_name(proposal.student_id),
                'status': proposal.status.value,
                'block_count': len(proposal.blocks),
                'total_minutes': proposal.total_minutes,
                'shortfall_minutes': proposal.shortfall_minutes,
                'applied_blocks': proposal.applied_blocks,
            }
            for proposal in run.proposals
        ],
    }


def plan_run_summary_to_dict(run) -> dict:
    """سرصفحه‌ی یک اجرا برای فهرست تاریخچه (بدون نام دانش‌آموزان)."""
    return {
        'id': run.id,
        'mode': run.mode.value,
        'intensity': run.intensity.value,
        'group_id': run.group_id,
        'group_tag': run.group_tag,
        'window': _window_to_dict(run.window),
        'summary': run.summary,
        'student_count': run.student_count,
        'pending_count': sum(1 for proposal in run.proposals if proposal.is_pending),
        'created_at': _datetime_field.to_representation(run.created_at) if run.created_at else None,
    }


def proposal_to_dict(proposal) -> dict:
    return {
        'id': proposal.id,
        'status': proposal.status.value,
        'group_tag': proposal.group_tag,
        'block_count': len(proposal.blocks),
        'total_minutes': proposal.total_minutes,
        'shortfall_minutes': proposal.shortfall_minutes,
        'applied_blocks': proposal.applied_blocks,
        'block_decisions': list(proposal.normalized_decisions()),
        'consultant_id': proposal.consultant_id,
        'goal_message': proposal.goal_message,
        'notice_seen_at': (
            _datetime_field.to_representation(proposal.notice_seen_at)
            if proposal.notice_seen_at else None
        ),
        'mode': proposal.mode.value if proposal.mode else None,
        'blocks': [planned_block_to_dict(block) for block in proposal.blocks],
        'created_at': _datetime_field.to_representation(proposal.created_at) if proposal.created_at else None,
        'responded_at': _datetime_field.to_representation(proposal.responded_at) if proposal.responded_at else None,
    }


def progress_to_dict(report) -> dict:
    """شکل خروجی گزارش پیشرفت — سازگار با پروفایل مدیر و پنل مشاور."""
    return {
        'user_id': report.user_id,
        'student_name': report.student_name,
        'phone_number': report.phone_number,
        'grade': report.grade,
        'olympiad_field': report.olympiad_field,
        'today': report.today,
        'week': report.week,
        'month': report.month,
        'total_sessions': report.total_sessions,
        'subjects_breakdown': [
            {
                'name': item.name,
                'color': item.color,
                'total_seconds': item.total_seconds,
                'percentage': item.percentage,
            }
            for item in report.subjects_breakdown
        ],
        'subjects_by_period': {
            'today': [_subject_row(item) for item in report.subjects_today],
            'week': [_subject_row(item) for item in report.subjects_week],
            'month': [_subject_row(item) for item in report.subjects_month],
        },
        'recent_sessions': [
            {
                'id': session.id,
                'subject': session.subject,
                'subject_color': session.subject_color,
                'duration_seconds': session.duration_seconds,
                'start_time': _datetime_field.to_representation(session.start_time),
                'end_time': (
                    _datetime_field.to_representation(session.end_time)
                    if session.end_time else None
                ),
                'description': session.description,
            }
            for session in report.recent_sessions
        ],
        'heatmap': [
            {
                'date': day.date,
                'total_seconds': day.total_seconds,
                'sessions': day.sessions,
            }
            for day in report.heatmap
        ],
        'heatmap_data': report.heatmap_data,
    }


def _subject_row(item) -> dict:
    return {
        'name': item.name,
        'color': item.color,
        'total_seconds': item.total_seconds,
        'percentage': item.percentage,
    }


def timeline_item_to_dict(item) -> dict:
    return {
        'id': item.id,
        'kind': item.kind,
        'source': item.source,
        'title': item.title,
        'color': item.color,
        'date': item.date,
        'jy': item.jy,
        'jm': item.jm,
        'jd': item.jd,
        'start_time': _datetime_field.to_representation(item.start_time),
        'end_time': (
            _datetime_field.to_representation(item.end_time) if item.end_time else None
        ),
        'start_minutes': item.start_minutes,
        'end_minutes': item.end_minutes,
        'duration_seconds': item.duration_seconds,
        'description': item.description,
    }


def daily_report_to_dict(report) -> dict:
    return {
        'user_id': report.user_id,
        'student_name': report.student_name,
        'date': report.date,
        'jy': report.jy,
        'jm': report.jm,
        'jd': report.jd,
        'total_seconds': report.total_seconds,
        'session_count': report.session_count,
        'subjects': [_subject_row(item) for item in report.subjects],
        'items': [timeline_item_to_dict(item) for item in report.items],
    }


def actual_calendar_to_dict(report) -> dict:
    return {
        'kind': report.kind,
        'source': report.source,
        'user_id': report.user_id,
        'student_name': report.student_name,
        'from': report.date_from,
        'to': report.date_to,
        'total_seconds': report.total_seconds,
        'session_count': report.session_count,
        'events': [timeline_item_to_dict(item) for item in report.events],
    }


def snapshot_to_dict(snapshot) -> dict:
    return {
        'id': snapshot.id,
        'reason': snapshot.reason,
        'plan_run_id': snapshot.plan_run_id,
        'event_count': snapshot.event_count,
        'taken_at': _datetime_field.to_representation(snapshot.taken_at) if snapshot.taken_at else None,
    }


def fixed_event_group_to_dict(group) -> dict:
    return {
        'group_id': group.group_id,
        'title': group.title,
        'description': group.description,
        'color': group.color,
        'start_minutes': group.start_minutes,
        'end_minutes': group.end_minutes,
        'dates': [{'jy': day.jy, 'jm': day.jm, 'jd': day.jd} for day in group.dates],
        'student_count': group.student_count,
        'event_count': group.event_count,
    }
