"""آداپتور خواندن جلسات مطالعه از مدل‌های اپ ``api``.

تنها فایلی در کانتکست reporting که به ``StudySession`` وابسته است.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from api.models import StudySession

from ..application.ports.study_report_reader import (
    DailyStudyTotal,
    RecentSessionHighlight,
    SessionRecord,
    StudyAggregate,
    SubjectStudyTotal,
)

IRAN_TZ = ZoneInfo('Asia/Tehran')


class DjangoStudyReportReader:
    def list_sessions(
        self, user_id: int, *,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> list[SessionRecord]:
        queryset = (
            StudySession.objects.filter(user_id=user_id)
            .select_related('subject')
            .order_by('-start_time', '-id')
        )
        if since is not None:
            queryset = queryset.filter(start_time__gte=since)
        if until is not None:
            queryset = queryset.filter(start_time__lt=until)
        return [self._to_record(row) for row in queryset]

    def aggregate_for_users(
        self, user_ids: Iterable[int], *, since: datetime | None = None,
    ) -> dict[int, StudyAggregate]:
        ids = list({int(user_id) for user_id in user_ids})
        if not ids:
            return {}
        queryset = StudySession.objects.filter(user_id__in=ids)
        if since is not None:
            queryset = queryset.filter(start_time__gte=since)
        rows = (
            queryset.values('user_id')
            .annotate(
                total_seconds=Sum('duration_seconds'),
                session_count=Count('id'),
            )
        )
        return {
            int(row['user_id']): StudyAggregate(
                user_id=int(row['user_id']),
                total_seconds=int(row['total_seconds'] or 0),
                session_count=int(row['session_count'] or 0),
            )
            for row in rows
        }

    def daily_totals_for_users(
        self, user_ids: Iterable[int], *, since: datetime, until: datetime,
    ) -> list[DailyStudyTotal]:
        ids = list({int(user_id) for user_id in user_ids})
        if not ids:
            return []
        rows = (
            StudySession.objects.filter(
                user_id__in=ids,
                start_time__gte=since,
                start_time__lt=until,
            )
            .annotate(day=TruncDate('start_time', tzinfo=IRAN_TZ))
            .values('day')
            .annotate(total_seconds=Sum('duration_seconds'))
            .order_by('day')
        )
        by_day = {
            row['day'].isoformat(): int(row['total_seconds'] or 0)
            for row in rows
            if row['day'] is not None
        }
        # پر کردن روزهای خالی برای sparkline پایدار
        cursor = since.astimezone(IRAN_TZ).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        end = until.astimezone(IRAN_TZ)
        result: list[DailyStudyTotal] = []
        while cursor < end:
            key = cursor.date().isoformat()
            result.append(DailyStudyTotal(date=key, total_seconds=by_day.get(key, 0)))
            cursor += timedelta(days=1)
        return result

    def recent_sessions_for_users(
        self, user_ids: Iterable[int], *, limit: int = 20,
    ) -> list[RecentSessionHighlight]:
        ids = list({int(user_id) for user_id in user_ids})
        if not ids:
            return []
        rows = (
            StudySession.objects.filter(user_id__in=ids)
            .select_related('subject')
            .order_by('-start_time', '-id')[: max(1, min(limit, 50))]
        )
        highlights: list[RecentSessionHighlight] = []
        for row in rows:
            start = row.start_time
            if timezone.is_naive(start):
                start = timezone.make_aware(start, timezone.get_current_timezone())
            subject = row.subject
            highlights.append(
                RecentSessionHighlight(
                    user_id=row.user_id,
                    subject_name=subject.name if subject else 'مطالعه',
                    duration_seconds=int(row.duration_seconds or 0),
                    start_time=start,
                )
            )
        return highlights

    def subject_totals_for_users(
        self, user_ids: Iterable[int], *, since: datetime | None = None,
    ) -> list[SubjectStudyTotal]:
        ids = list({int(user_id) for user_id in user_ids})
        if not ids:
            return []
        queryset = StudySession.objects.filter(user_id__in=ids)
        if since is not None:
            queryset = queryset.filter(start_time__gte=since)
        rows = (
            queryset.values('subject__name')
            .annotate(total_seconds=Sum('duration_seconds'))
            .order_by('-total_seconds')
        )
        return [
            SubjectStudyTotal(
                subject_name=row['subject__name'] or 'بدون موضوع',
                total_seconds=int(row['total_seconds'] or 0),
            )
            for row in rows
            if int(row['total_seconds'] or 0) > 0
        ]

    @staticmethod
    def _to_record(row: StudySession) -> SessionRecord:
        start = row.start_time
        if timezone.is_naive(start):
            start = timezone.make_aware(start, timezone.get_current_timezone())
        end = row.end_time
        if end is not None and timezone.is_naive(end):
            end = timezone.make_aware(end, timezone.get_current_timezone())
        subject = row.subject
        return SessionRecord(
            id=row.id,
            subject_name=subject.name if subject else 'بدون موضوع',
            subject_color=(subject.color_code if subject else '') or '#10b981',
            description=row.description or '',
            start_time=start,
            end_time=end,
            duration_seconds=int(row.duration_seconds or 0),
        )
