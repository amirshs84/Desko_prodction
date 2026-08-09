"""پیشخوان مشاور — تریاژ و گیمیفیکیشن، محاسبه‌شده در سرور.

نتیجه با Django cache برای چند دقیقه نگه داشته می‌شود تا Job شبانه
بتواند همان کلید را گرم کند؛ منطق لیست‌ها عمداً کلاینت‌ساید نیست.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from django.core.cache import cache
from django.utils import timezone as dj_timezone

from ....reporting.application.iran_clock import WEEK_LOOKBACK_DAYS, ReportWindows
from ....reporting.application.ports.study_report_reader import StudyReportReader
from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError
from ...domain.entities.direct_message import MessageSender
from ...domain.repositories.direct_message_repository import DirectMessageRepository
from ...domain.repositories.plan_run_repository import PlanRunRepository
from ..dto.roster_dto import performance_score

CACHE_TTL_SECONDS = 300  # ۵ دقیقه — آماده برای گرم‌کردن توسط cron


def bust_dashboard_cache(*, consultant_id: int, school_id: int) -> None:
    cache.delete(f'planning:consultant_dashboard:{consultant_id}:{school_id}')


class ConsultantDashboardService:
    def __init__(
        self,
        *,
        directory: SchoolDirectory,
        reports: StudyReportReader,
        messages: DirectMessageRepository,
        plan_runs: PlanRunRepository,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._directory = directory
        self._reports = reports
        self._messages = messages
        self._plan_runs = plan_runs
        self._clock = clock or (lambda: dj_timezone.now())

    def get_dashboard(self, *, context: RequestContext) -> dict[str, Any]:
        school_id = _require_consultant(context)
        cache_key = f'planning:consultant_dashboard:{context.actor_user_id}:{school_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        payload = self._build(context=context, school_id=school_id)
        cache.set(cache_key, payload, CACHE_TTL_SECONDS)
        return payload

    def _build(self, *, context: RequestContext, school_id: int) -> dict[str, Any]:
        now = self._clock()
        windows = ReportWindows.at(now)
        prev_week_start = windows.week_start - timedelta(days=WEEK_LOOKBACK_DAYS)

        students = self._directory.list_students(school_id)
        by_id = {s.user_id: s for s in students}
        student_ids = list(by_id.keys())

        week_agg = self._reports.aggregate_for_users(student_ids, since=windows.week_start)
        prev_only = self._prev_week_seconds(
            student_ids, since=prev_week_start, until=windows.week_start,
        )

        spark_days = self._reports.daily_totals_for_users(
            student_ids,
            since=windows.week_start,
            until=windows.now + timedelta(seconds=1),
        )
        sparkline_hours = [round(day.total_seconds / 3600.0, 2) for day in spark_days]

        recent_messages = self._messages.list_recent_for_consultant(
            consultant_id=context.actor_user_id, limit=60,
        )
        latest_by_student: dict[int, Any] = {}
        for msg in recent_messages:
            if msg.student_id not in latest_by_student:
                latest_by_student[msg.student_id] = msg
        awaiting_reply_ids = {
            sid
            for sid, msg in latest_by_student.items()
            if msg.sender_role is MessageSender.STUDENT
        }

        rows: list[dict[str, Any]] = []
        for sid, student in by_id.items():
            week_sec = week_agg.get(sid).total_seconds if week_agg.get(sid) else 0
            prev_sec = prev_only.get(sid, 0)
            perf = performance_score(week_sec, period='weekly')
            rows.append({
                'user_id': sid,
                'full_name': student.full_name or student.phone_number or f'#{sid}',
                'study_seconds': week_sec,
                'prev_study_seconds': prev_sec,
                'delta_seconds': week_sec - prev_sec,
                'performance': perf,
                'progress_percent': int(round(perf * 100)),
                'awaiting_reply': sid in awaiting_reply_ids,
            })

        total_seconds = sum(r['study_seconds'] for r in rows)
        avg_completion = (
            int(round(sum(r['progress_percent'] for r in rows) / len(rows)))
            if rows else 0
        )

        top_performers = sorted(
            rows, key=lambda r: (r['study_seconds'], r['performance']), reverse=True,
        )[:5]

        at_risk: list[dict[str, Any]] = []
        risk_sorted = sorted(
            rows,
            key=lambda x: (
                0 if x['awaiting_reply'] else 1,
                x['performance'],
                x['study_seconds'],
            ),
        )
        for r in risk_sorted:
            if len(at_risk) >= 5:
                break
            reason = None
            if r['awaiting_reply']:
                reason = 'پیام خوانده‌نشده'
            elif r['study_seconds'] <= 0:
                reason = 'بدون مطالعه در هفته'
            elif r['performance'] < 0.3:
                reason = 'افت شدید مطالعه'
            if reason:
                at_risk.append({**r, 'reason': reason})

        rising = [
            r for r in sorted(rows, key=lambda x: x['delta_seconds'], reverse=True)
            if r['delta_seconds'] > 0
        ][:5]

        return {
            'gamification': {
                'avg_completion_percent': avg_completion,
                'total_study_hours': round(total_seconds / 3600.0, 1),
                'sparkline_hours': sparkline_hours,
                'student_count': len(rows),
            },
            'top_performers': [
                {
                    'user_id': r['user_id'],
                    'full_name': r['full_name'],
                    'progress_percent': r['progress_percent'],
                    'study_seconds': r['study_seconds'],
                }
                for r in top_performers
            ],
            'at_risk': [
                {
                    'user_id': r['user_id'],
                    'full_name': r['full_name'],
                    'reason': r['reason'],
                    'study_seconds': r['study_seconds'],
                    'progress_percent': r['progress_percent'],
                }
                for r in at_risk
            ],
            'rising_stars': [
                {
                    'user_id': r['user_id'],
                    'full_name': r['full_name'],
                    'delta_seconds': r['delta_seconds'],
                    'study_seconds': r['study_seconds'],
                    'progress_percent': r['progress_percent'],
                }
                for r in rising
            ],
            'pending': self._pending_items(context.actor_user_id, by_id),
            'inbox': self._inbox_items(latest_by_student, by_id),
            'live_feed': self._live_feed(student_ids, by_id),
            'cached_at': dj_timezone.now().isoformat(),
            'cache_ttl_seconds': CACHE_TTL_SECONDS,
        }

    def _prev_week_seconds(
        self, user_ids: list[int], *, since: datetime, until: datetime,
    ) -> dict[int, int]:
        """ثانیه مطالعه فقط در هفتهٔ قبل (نه از ابتدای دو هفته تا الان)."""
        both = self._reports.aggregate_for_users(user_ids, since=since)
        week = self._reports.aggregate_for_users(user_ids, since=until)
        result: dict[int, int] = {}
        for uid in user_ids:
            both_sec = both.get(uid).total_seconds if both.get(uid) else 0
            week_sec = week.get(uid).total_seconds if week.get(uid) else 0
            result[uid] = max(0, both_sec - week_sec)
        return result

    def _pending_items(
        self, consultant_id: int, by_id: dict,
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        runs = self._plan_runs.list_for_consultant(consultant_id, limit=30)
        for run in runs:
            for proposal in run.proposals:
                if not proposal.is_pending:
                    continue
                student = by_id.get(proposal.student_id)
                items.append({
                    'type': 'proposal',
                    'run_id': run.id,
                    'student_id': proposal.student_id,
                    'student_name': (
                        student.full_name if student else f'#{proposal.student_id}'
                    ),
                    'label': 'پیشنهاد برنامه در انتظار پاسخ دانش‌آموز',
                    'created_at': (
                        run.created_at.isoformat() if run.created_at else None
                    ),
                })
                if len(items) >= 8:
                    return items
        return items

    def _inbox_items(
        self, latest_by_student: dict[int, Any], by_id: dict,
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for student_id, msg in latest_by_student.items():
            student = by_id.get(student_id)
            urgency = _message_urgency(msg.body, msg.sender_role)
            items.append({
                'id': msg.id,
                'student_id': student_id,
                'student_name': student.full_name if student else f'#{student_id}',
                'body': msg.body[:180],
                'sender_role': msg.sender_role.value,
                'urgency': urgency,
                'created_at': msg.created_at.isoformat() if msg.created_at else None,
            })
        order = {'red': 0, 'yellow': 1, 'green': 2}

        def _sort_key(item: dict[str, Any]) -> tuple:
            ts = 0.0
            raw = item.get('created_at')
            if raw:
                try:
                    ts = datetime.fromisoformat(raw).timestamp()
                except ValueError:
                    ts = 0.0
            return (order.get(item['urgency'], 9), -ts)

        items.sort(key=_sort_key)
        return items[:12]

    def _live_feed(
        self, student_ids: list[int], by_id: dict,
    ) -> list[dict[str, Any]]:
        sessions = self._reports.recent_sessions_for_users(student_ids, limit=15)
        feed: list[dict[str, Any]] = []
        for session in sessions:
            student = by_id.get(session.user_id)
            name = student.full_name if student else f'#{session.user_id}'
            minutes = max(1, session.duration_seconds // 60)
            feed.append({
                'id': f'session-{session.user_id}-{session.start_time.isoformat()}',
                'kind': 'study',
                'text': f'{name} جلسهٔ {session.subject_name} را با موفقیت تمام کرد ({minutes} دقیقه)',
                'student_id': session.user_id,
                'student_name': name,
                'created_at': session.start_time.isoformat(),
            })
        return feed


def _message_urgency(body: str, sender_role: MessageSender) -> str:
    text = (body or '').casefold()
    urgent_keys = ('امتحان', 'فردا', 'اورژانس', 'کمک', 'هیچی', 'نخوندم', 'اضطرار')
    if sender_role is MessageSender.STUDENT and any(k in text for k in urgent_keys):
        return 'red'
    if sender_role is MessageSender.STUDENT:
        return 'yellow'
    return 'green'


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('پیشخوان مشاور فقط برای نقش مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
