"""آداپتور خواندن جلسات مطالعه از مدل‌های اپ ``api``.

تنها فایلی در کانتکست reporting که به ``StudySession`` وابسته است.
"""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

from django.db.models import Count, Sum
from django.utils import timezone

from api.models import StudySession

from ..application.ports.study_report_reader import SessionRecord, StudyAggregate


class DjangoStudyReportReader:
    def list_sessions(
        self, user_id: int, *, since: datetime | None = None,
    ) -> list[SessionRecord]:
        queryset = (
            StudySession.objects.filter(user_id=user_id)
            .select_related('subject')
            .order_by('-start_time', '-id')
        )
        if since is not None:
            queryset = queryset.filter(start_time__gte=since)
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
