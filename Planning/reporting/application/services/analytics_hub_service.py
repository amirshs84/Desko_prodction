"""هاب گزارش مشاور — تجمیع کلاس‌محور با کش کوتاه‌مدت.

کوئری‌ها سنگین‌اند؛ نتیجه در Django cache نگه داشته می‌شود تا بعداً بتوان
Replica-Read یا Materialized View را پشت همین قرارداد گذاشت.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from django.core.cache import cache
from django.utils import timezone as dj_timezone

from ....intervention.domain.enums import PlanMode, ProposalStatus
from ....intervention.domain.repositories.plan_run_repository import PlanRunRepository
from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ..iran_clock import WEEK_LOOKBACK_DAYS, ReportWindows
from ..ports.study_report_reader import StudyReportReader

CACHE_TTL_SECONDS = 180
_VALID_PERIODS = frozenset({'weekly', 'monthly'})


class AnalyticsHubService:
    def __init__(
        self,
        *,
        directory: SchoolDirectory,
        reports: StudyReportReader,
        plan_runs: PlanRunRepository,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._directory = directory
        self._reports = reports
        self._plan_runs = plan_runs
        self._clock = clock or (lambda: dj_timezone.now())

    def get_hub(self, *, context: RequestContext, period: str = 'weekly') -> dict[str, Any]:
        school_id = _require_consultant(context)
        period = (period or 'weekly').lower()
        if period not in _VALID_PERIODS:
            raise ValidationError(
                'بازه زمانی نامعتبر است.',
                meta={'period': period, 'allowed': sorted(_VALID_PERIODS)},
            )

        cache_key = (
            f'planning:consultant_analytics:{context.actor_user_id}:{school_id}:{period}'
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        payload = self._build(
            context=context, school_id=school_id, period=period,
        )
        cache.set(cache_key, payload, CACHE_TTL_SECONDS)
        return payload

    def _build(
        self, *, context: RequestContext, school_id: int, period: str,
    ) -> dict[str, Any]:
        now = self._clock()
        windows = ReportWindows.at(now)
        since = windows.week_start if period == 'weekly' else windows.month_start
        lookback = WEEK_LOOKBACK_DAYS if period == 'weekly' else 30
        prev_since = since - timedelta(days=lookback)

        students = self._directory.list_students(school_id)
        student_ids = [s.user_id for s in students]

        cur_agg = self._reports.aggregate_for_users(student_ids, since=since)
        prev_only = self._window_seconds(student_ids, since=prev_since, until=since)

        classes = self._directory.list_classes(school_id)
        class_performance = self._class_performance(
            school_id=school_id,
            classes=classes,
            cur_agg=cur_agg,
            period=period,
        )

        subject_radar = self._subject_radar(student_ids, since=since)
        study_trend = self._study_trend(student_ids, since=since, until=windows.now)
        cohort_flow = self._cohort_sankey(
            student_ids, cur_agg=cur_agg, prev_only=prev_only, period=period,
        )
        plan_execution, recent_actions = self._plan_stats(context.actor_user_id)

        return {
            'period': period,
            'class_performance': class_performance,
            'subject_radar': subject_radar,
            'study_trend': study_trend,
            'cohort_flow': cohort_flow,
            'exam_trend': {
                'available': False,
                'points': [],
                'note': 'ماژول آزمون هنوز متصل نیست؛ به‌جای آن روند مطالعه و جریان کوهورت نمایش داده می‌شود.',
            },
            'plan_execution': plan_execution,
            'recent_actions': recent_actions,
            'cached_at': dj_timezone.now().isoformat(),
            'cache_ttl_seconds': CACHE_TTL_SECONDS,
        }

    def _class_performance(
        self, *, school_id: int, classes, cur_agg, period: str,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for cls in classes:
            member_ids = self._directory.list_class_student_user_ids(
                cls.id, school_id=school_id,
            )
            if not member_ids:
                continue
            total_sec = 0
            perf_sum = 0.0
            for uid in member_ids:
                sec = cur_agg.get(uid).total_seconds if cur_agg.get(uid) else 0
                total_sec += sec
                perf_sum += _performance_score(sec, period=period)
            count = len(member_ids)
            avg_sec = int(total_sec / count) if count else 0
            avg_perf = perf_sum / count if count else 0.0
            rows.append({
                'class_id': cls.id,
                'name': cls.name,
                'code': cls.code,
                'grade': cls.grade,
                'student_count': count,
                'avg_study_seconds': avg_sec,
                'total_study_seconds': total_sec,
                'avg_performance': round(avg_perf, 3),
                'avg_progress_percent': int(round(avg_perf * 100)),
            })
        rows.sort(key=lambda r: r['avg_study_seconds'], reverse=True)
        return rows

    def _subject_radar(
        self, student_ids: list[int], *, since: datetime,
    ) -> list[dict[str, Any]]:
        totals = self._reports.subject_totals_for_users(student_ids, since=since)
        if not totals:
            return []
        # حداکثر ۸ درس برای خوانایی عنکبوتی
        top = totals[:8]
        grand = sum(t.total_seconds for t in top) or 1
        max_sec = max(t.total_seconds for t in top) or 1
        return [
            {
                'subject': t.subject_name,
                'total_seconds': t.total_seconds,
                'share_percent': round(100.0 * t.total_seconds / grand, 1),
                # مقدار نرمال ۰..۱۰۰ برای محور رادار
                'balance': int(round(100.0 * t.total_seconds / max_sec)),
            }
            for t in top
        ]

    def _study_trend(
        self, student_ids: list[int], *, since: datetime, until: datetime,
    ) -> list[dict[str, Any]]:
        days = self._reports.daily_totals_for_users(
            student_ids, since=since, until=until + timedelta(seconds=1),
        )
        return [
            {
                'date': day.date,
                'hours': round(day.total_seconds / 3600.0, 2),
                'study_seconds': day.total_seconds,
            }
            for day in days
        ]

    def _cohort_sankey(
        self,
        student_ids: list[int],
        *,
        cur_agg,
        prev_only: dict[int, int],
        period: str,
    ) -> dict[str, Any]:
        """جریان کوهورت: سطح عملکرد هفته/ماه قبل → دوره جاری."""
        buckets = ('ضعیف', 'متوسط', 'قوی')
        nodes = [
            {'name': f'قبل · {b}'} for b in buckets
        ] + [
            {'name': f'الان · {b}'} for b in buckets
        ]
        # matrix[prev][cur]
        matrix = [[0, 0, 0] for _ in range(3)]
        for uid in student_ids:
            prev_sec = prev_only.get(uid, 0)
            cur_sec = cur_agg.get(uid).total_seconds if cur_agg.get(uid) else 0
            pi = _bucket_index(_performance_score(prev_sec, period=period))
            ci = _bucket_index(_performance_score(cur_sec, period=period))
            matrix[pi][ci] += 1

        links: list[dict[str, Any]] = []
        for pi in range(3):
            for ci in range(3):
                value = matrix[pi][ci]
                if value <= 0:
                    continue
                links.append({
                    'source': pi,
                    'target': 3 + ci,
                    'value': value,
                    'label': f'{buckets[pi]} → {buckets[ci]}',
                })
        return {
            'nodes': nodes,
            'links': links,
            'note': 'جریان وضعیت عملکرد مطالعه بین دو بازه متوالی (جایگزین موقت Sankey آزمون‌به‌آزمون).',
        }

    def _plan_stats(self, consultant_id: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        runs = self._plan_runs.list_for_consultant(consultant_id, limit=40)
        accepted = rejected = pending = 0
        forced = suggested = 0
        proposals_total = 0
        actions: list[dict[str, Any]] = []

        for run in runs:
            if run.mode is PlanMode.FORCED:
                forced += 1
            else:
                suggested += 1
            pending_count = 0
            accepted_count = 0
            rejected_count = 0
            for proposal in run.proposals:
                proposals_total += 1
                if proposal.status is ProposalStatus.ACCEPTED:
                    accepted += 1
                    accepted_count += 1
                elif proposal.status is ProposalStatus.REJECTED:
                    rejected += 1
                    rejected_count += 1
                else:
                    pending += 1
                    pending_count += 1

            actions.append({
                'kind': 'plan_run',
                'id': run.id,
                'mode': run.mode.value,
                'intensity': run.intensity.value,
                'student_count': run.student_count,
                'pending_count': pending_count,
                'accepted_count': accepted_count,
                'rejected_count': rejected_count,
                'group_tag': run.group_tag,
                'created_at': run.created_at.isoformat() if run.created_at else None,
            })

        decided = accepted + rejected
        accept_rate = round(accepted / decided, 3) if decided else 0.0
        execution = {
            'runs_total': len(runs),
            'proposals_total': proposals_total,
            'accepted': accepted,
            'rejected': rejected,
            'pending': pending,
            'accept_rate': accept_rate,
            'forced_runs': forced,
            'suggested_runs': suggested,
        }
        return execution, actions

    def _window_seconds(
        self, user_ids: list[int], *, since: datetime, until: datetime,
    ) -> dict[int, int]:
        both = self._reports.aggregate_for_users(user_ids, since=since)
        cur = self._reports.aggregate_for_users(user_ids, since=until)
        result: dict[int, int] = {}
        for uid in user_ids:
            both_sec = both.get(uid).total_seconds if both.get(uid) else 0
            cur_sec = cur.get(uid).total_seconds if cur.get(uid) else 0
            result[uid] = max(0, both_sec - cur_sec)
        return result


def _bucket_index(score: float) -> int:
    if score < 0.3:
        return 0
    if score < 0.7:
        return 1
    return 2


def _performance_score(study_seconds: int, *, period: str) -> float:
    """هم‌تراز با roster — نرمال‌سازی مطالعه به ۰..۱."""
    hours = max(0.0, study_seconds / 3600.0)
    if period == 'monthly':
        thresholds = (10.0, 20.0, 40.0, 60.0)
    else:
        thresholds = (3.0, 7.0, 14.0, 20.0)
    if hours <= 0:
        return 0.0
    if hours >= thresholds[-1]:
        return 1.0
    prev = 0.0
    for index, limit in enumerate(thresholds):
        if hours <= limit:
            span = limit - prev
            ratio = (hours - prev) / span if span else 1.0
            return (index + ratio) / len(thresholds)
        prev = limit
    return 1.0


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('هاب گزارش فقط برای نقش مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
