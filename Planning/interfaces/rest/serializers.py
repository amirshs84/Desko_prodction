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

from ...intervention.domain.enums import IntensityLevel, PlanMode
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
        'class_names': list(student.class_names),
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
    return {
        **student_to_dict(entry.student),
        'groups': [{'id': group_id, 'name': name} for group_id, name in entry.groups],
    }


class SubjectQuotaSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=100)
    minutes = serializers.IntegerField(min_value=1)


class PlanBuildSerializer(serializers.Serializer):
    """ورودی مشترک پیش‌نمایش و انتشار برنامه‌ی گروهی.

    مخاطب: ``group_id`` یا ``student_ids``. تقاضا: یا ``quotas`` (سهمیه‌ی صریح هر
    درس) یا ``subjects`` + ``total_minutes`` که با ``ratios`` وزن‌دهی می‌شود.
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

    def validate(self, attrs):
        if bool(attrs.get('group_id')) == bool(attrs.get('student_ids')):
            raise serializers.ValidationError(
                'دقیقاً یکی از «group_id» یا «student_ids» را بفرستید.'
            )
        if bool(attrs.get('quotas')) == bool(attrs.get('subjects')):
            raise serializers.ValidationError(
                'یا سهمیه‌ی هر درس («quotas») را بفرستید یا فهرست درس‌ها و زمان کل.'
            )
        if attrs.get('subjects') and not attrs.get('total_minutes'):
            raise serializers.ValidationError('«total_minutes» برای این حالت الزامی است.')
        return attrs


class ProposalRespondSerializer(serializers.Serializer):
    accept = serializers.BooleanField()


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
            {'subject': quota.subject, 'minutes': quota.minutes} for quota in draft.quotas
        ],
        'allocated_by_subject': dict(draft.allocated_by_subject),
        'required_minutes': draft.required_minutes,
        'allocated_minutes': draft.allocated_minutes,
        'capacity_minutes': draft.capacity_minutes,
        'shortfall_minutes': draft.shortfall_minutes,
        'has_deadlock': draft.has_deadlock,
        'warnings': [_warning_to_dict(warning) for warning in draft.warnings],
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
