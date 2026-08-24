from __future__ import annotations

import json
import math
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from urllib.parse import quote
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import UserProfile
from api.permissions import IsConsultant, IsManager

from .athena_client import AthenaClient, AthenaError
from .identity import ensure_athena_id, profiles_by_athena_ids
from .models import ExamAsset, ExamRecord, SessionParticipantRecord, SessionRecord


def _athena_response(exc: AthenaError) -> Response:
    http_status = exc.status_code if 400 <= exc.status_code < 600 else 502
    messages = {
        'athena_error': 'موتور آزمون خطا داد.',
        'athena_unavailable': 'ارتباط با موتور آزمون برقرار نشد.',
        'attempt_already_exists': 'برای این آزمون قبلاً شروع کرده‌اید.',
        'session_not_started_yet': 'زمان شروع آزمون هنوز نرسیده است.',
        'session_already_expired': 'زمان این آزمون به پایان رسیده است.',
        'session_attempt_not_found': 'تلاش آزمون پیدا نشد.',
        'participant_is_not_assigned': 'شما در این آزمون ثبت نشده‌اید.',
    }
    code = str(exc.code)
    return Response(
        {
            'code': code,
            'detail': exc.detail,
            'error': messages.get(code) or (exc.detail if isinstance(exc.detail, str) else code),
        },
        status=http_status,
    )


def _booklet_file_response(asset: ExamAsset):
    if not asset or not asset.file:
        return Response({'error': 'فایل دفترچه ثبت نشده است'}, status=404)
    try:
        exists = asset.file.storage.exists(asset.file.name)
    except Exception:
        exists = False
    if not exists:
        return Response({'error': 'فایل دفترچه روی سرور پیدا نشد. دوباره از پنل مشاور آپلود کنید.'}, status=404)
    filename = asset.original_name or 'booklet.pdf'
    response = FileResponse(
        asset.file.open('rb'),
        as_attachment=False,
        filename=filename,
        content_type=asset.content_type or 'application/pdf',
    )
    response['Content-Disposition'] = f"inline; filename*=UTF-8''{quote(filename)}"
    return response


def _can_access_session_booklet(user, record: SessionRecord) -> bool:
    profile = _profile(user)
    if record.created_by_id == user.id:
        return True
    if profile.role == 'manager' and profile.school_id == record.school_id:
        return True
    return SessionParticipantRecord.objects.filter(
        session=record,
        user=user,
        status=SessionParticipantRecord.STATUS_ASSIGNED,
    ).exists()


def _profile(user) -> UserProfile:
    return user.profile


def _school_or_error(request):
    try:
        school = request.user.profile.school
    except UserProfile.DoesNotExist:
        school = None
    if school is None:
        return None, Response({'error': 'کاربر به مدرسه‌ای متصل نیست'}, status=400)
    return school, None


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        from django.utils import timezone as dj_tz
        return dj_tz.make_aware(value, dj_tz.get_current_timezone())
    return value


def _parse_dt(raw: str | None):
    if not raw:
        return None
    parsed = parse_datetime(raw)
    if parsed is None:
        raise ValueError('زمان نامعتبر است')
    return _aware(parsed)


def _client_for(user) -> AthenaClient:
    return AthenaClient(ensure_athena_id(user))


def _school_student_ids(school) -> set[int]:
    return set(
        UserProfile.objects.filter(role='student', school=school).values_list('user_id', flat=True)
    )


def _serialize_exam(record: ExamRecord) -> dict:
    return {
        'id': record.id,
        'athena_exam_id': str(record.athena_exam_id),
        'title': record.title,
        'description': record.description,
        'problems_count': record.problems_count,
        'options_per_problem': record.options_per_problem,
        'booklet_url': f'/api/exams/{record.id}/booklet/',
        'booklet_name': record.asset.original_name if record.asset_id else '',
        'created_at': record.created_at.isoformat(),
        'session_count': record.sessions.count(),
    }


def _serialize_session(record: SessionRecord, extra: dict | None = None) -> dict:
    payload = {
        'id': record.id,
        'athena_session_id': str(record.athena_session_id),
        'exam_id': record.exam_id,
        'exam_title': record.exam.title,
        'title': record.title,
        'start_time': record.start_time.isoformat(),
        'end_time': record.end_time.isoformat(),
        'status': record.status,
        'problems_count': record.exam.problems_count,
        'options_per_problem': record.exam.options_per_problem,
        'booklet_url': f'/api/exam-sessions/{record.id}/booklet/',
        'participant_count': record.participants.filter(
            status=SessionParticipantRecord.STATUS_ASSIGNED
        ).count(),
    }
    if extra:
        payload.update(extra)
    return payload


def _sync_session_status(record: SessionRecord, live: dict | None) -> SessionRecord:
    if not live:
        return record
    status_value = live.get('status')
    if status_value and status_value != record.status:
        record.status = status_value
        record.save(update_fields=['status', 'updated_at'])
    return record


def _percent(score, max_score) -> float | None:
    if score is None or max_score in (None, 0, '0'):
        return None
    try:
        return round(float(Decimal(str(score)) / Decimal(str(max_score)) * 100), 1)
    except Exception:
        return None


def _answer_stats(answers: list[dict]) -> dict:
    correct = wrong = blank = 0
    for item in answers:
        selected = (item.get('response_data') or {}).get('selected_option_id')
        if selected is None:
            blank += 1
        elif selected == item.get('correct_option_id'):
            correct += 1
        else:
            wrong += 1
    return {'correct': correct, 'wrong': wrong, 'blank': blank, 'answered': correct + wrong}


class ConsultantExamListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        school, error = _school_or_error(request)
        if error:
            return error
        records = ExamRecord.objects.filter(created_by=request.user, school=school).select_related('asset')
        return Response([_serialize_exam(item) for item in records])

    def post(self, request):
        school, error = _school_or_error(request)
        if error:
            return error
        title = (request.data.get('title') or '').strip()
        description = (request.data.get('description') or '').strip()
        booklet = request.FILES.get('booklet') or request.FILES.get('file')
        try:
            problems_count = int(request.data.get('problems_count'))
            options_per_problem = int(request.data.get('options_per_problem') or 4)
        except (TypeError, ValueError):
            return Response({'error': 'تعداد سوال یا گزینه نامعتبر است'}, status=400)

        raw_keys = request.data.get('answer_keys')
        if isinstance(raw_keys, str):
            try:
                raw_keys = json.loads(raw_keys)
            except json.JSONDecodeError:
                return Response({'error': 'کلید پاسخ نامعتبر است'}, status=400)
        if not isinstance(raw_keys, dict):
            return Response({'error': 'کلید پاسخ الزامی است'}, status=400)

        answer_keys = {int(key): int(value) for key, value in raw_keys.items()}
        if not title or booklet is None:
            return Response({'error': 'عنوان و فایل PDF الزامی است'}, status=400)
        if booklet.content_type not in ('application/pdf', 'application/x-pdf') and not booklet.name.lower().endswith('.pdf'):
            return Response({'error': 'فقط فایل PDF پذیرفته می‌شود'}, status=400)
        if problems_count < 1 or options_per_problem < 2:
            return Response({'error': 'تعداد سوال/گزینه نامعتبر است'}, status=400)
        expected = set(range(1, problems_count + 1))
        if set(answer_keys) != expected:
            return Response({'error': 'کلید باید برای همه سوال‌ها مشخص شود'}, status=400)
        if any(value < 1 or value > options_per_problem for value in answer_keys.values()):
            return Response({'error': 'گزینه صحیح خارج از محدوده است'}, status=400)

        owner_id = ensure_athena_id(request.user)
        asset = ExamAsset.objects.create(
            owner=request.user,
            file=booklet,
            original_name=booklet.name,
            content_type=booklet.content_type or 'application/pdf',
        )
        try:
            result = _client_for(request.user).create_exam({
                'title': title,
                'description': description or None,
                'exam_type': 'SINGLE_PDF',
                'config': {
                    'render_mode': 'SINGLE_PDF',
                    'source': {
                        'owner_id': str(owner_id),
                        'asset_id': str(asset.id),
                    },
                },
                'content': {
                    'problems_count': problems_count,
                    'options_per_problem': options_per_problem,
                    'answer_keys': {str(key): value for key, value in answer_keys.items()},
                },
            })
        except AthenaError as exc:
            asset.file.delete(save=False)
            asset.delete()
            return _athena_response(exc)

        record = ExamRecord.objects.create(
            athena_exam_id=result['exam_id'],
            created_by=request.user,
            school=school,
            asset=asset,
            title=title,
            description=description,
            problems_count=problems_count,
            options_per_problem=options_per_problem,
        )
        return Response(_serialize_exam(record), status=status.HTTP_201_CREATED)


class ConsultantExamDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request, exam_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        exam = get_object_or_404(ExamRecord, id=exam_id, created_by=request.user, school=school)
        sessions = [_serialize_session(item) for item in exam.sessions.all()]
        payload = _serialize_exam(exam)
        payload['sessions'] = sessions
        return Response(payload)


class ConsultantExamBookletView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request, exam_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        exam = get_object_or_404(ExamRecord, id=exam_id, created_by=request.user, school=school)
        return _booklet_file_response(exam.asset)


class ConsultantExamSessionListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def post(self, request, exam_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        exam = get_object_or_404(ExamRecord, id=exam_id, created_by=request.user, school=school)
        title = (request.data.get('title') or exam.title).strip()
        try:
            start_time = _parse_dt(request.data.get('start_time'))
            end_time = _parse_dt(request.data.get('end_time'))
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        if start_time is None or end_time is None:
            return Response({'error': 'زمان شروع و پایان الزامی است'}, status=400)
        try:
            result = _client_for(request.user).create_session(
                exam.athena_exam_id,
                {
                    'title': title,
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat(),
                },
            )
        except AthenaError as exc:
            return _athena_response(exc)
        record = SessionRecord.objects.create(
            athena_session_id=result['session_id'],
            exam=exam,
            created_by=request.user,
            school=school,
            title=title,
            start_time=start_time,
            end_time=end_time,
        )
        return Response(_serialize_session(record), status=status.HTTP_201_CREATED)


class ConsultantSessionDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        live = None
        try:
            live = _client_for(request.user).get_session(record.athena_session_id)
            _sync_session_status(record, live)
        except AthenaError:
            pass
        participants = [
            {
                'user_id': item.user_id,
                'full_name': getattr(item.user.profile, 'full_name', '') or item.user.username,
                'status': item.status,
            }
            for item in record.participants.select_related('user__profile')
        ]
        payload = _serialize_session(record)
        payload['participants'] = participants
        payload['live'] = live
        return Response(payload)

    def patch(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        payload = {}
        if request.data.get('title'):
            payload['title'] = request.data['title'].strip()
        try:
            if request.data.get('start_time'):
                payload['start_time'] = _parse_dt(request.data.get('start_time')).isoformat()
            if request.data.get('end_time'):
                payload['end_time'] = _parse_dt(request.data.get('end_time')).isoformat()
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        if not payload:
            return Response({'error': 'هیچ فیلدی برای ویرایش ارسال نشده'}, status=400)
        try:
            _client_for(request.user).update_session(record.athena_session_id, payload)
        except AthenaError as exc:
            return _athena_response(exc)
        if 'title' in request.data:
            record.title = request.data['title'].strip()
        if payload.get('start_time'):
            record.start_time = _parse_dt(request.data.get('start_time'))
        if payload.get('end_time'):
            record.end_time = _parse_dt(request.data.get('end_time'))
        record.save()
        return Response(_serialize_session(record))


class ConsultantSessionParticipantsView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def post(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        user_ids = request.data.get('user_ids') or []
        if not isinstance(user_ids, list) or not user_ids:
            return Response({'error': 'لیست دانش‌آموز خالی است'}, status=400)
        try:
            user_ids = [int(value) for value in user_ids]
        except (TypeError, ValueError):
            return Response({'error': 'شناسه دانش‌آموز نامعتبر است'}, status=400)

        allowed = _school_student_ids(school)
        if any(user_id not in allowed for user_id in user_ids):
            return Response({'error': 'فقط دانش‌آموزان همین مدرسه قابل افزودن هستند'}, status=403)

        profiles = {
            profile.user_id: profile
            for profile in UserProfile.objects.filter(user_id__in=user_ids, role='student')
        }
        athena_ids = []
        for user_id in user_ids:
            profile = profiles.get(user_id)
            if profile is None:
                return Response({'error': f'دانش‌آموز {user_id} یافت نشد'}, status=404)
            athena_ids.append(ensure_athena_id(profile.user))

        try:
            result = _client_for(request.user).add_participants(record.athena_session_id, athena_ids)
        except AthenaError as exc:
            return _athena_response(exc)

        for user_id in user_ids:
            profile = profiles[user_id]
            SessionParticipantRecord.objects.update_or_create(
                session=record,
                user=profile.user,
                defaults={
                    'athena_user_id': profile.athena_id,
                    'status': SessionParticipantRecord.STATUS_ASSIGNED,
                },
            )
        return Response(result)

    def get(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        items = [
            {
                'user_id': item.user_id,
                'full_name': getattr(item.user.profile, 'full_name', '') or '',
                'grade': getattr(item.user.profile, 'grade', '') or '',
                'status': item.status,
            }
            for item in record.participants.select_related('user__profile').order_by('id')
        ]
        return Response({'items': items, 'total': len(items)})


class ConsultantSessionParticipantDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def delete(self, request, session_id: int, user_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        participant = get_object_or_404(SessionParticipantRecord, session=record, user_id=user_id)
        try:
            _client_for(request.user).remove_participant(
                record.athena_session_id, participant.athena_user_id
            )
        except AthenaError as exc:
            return _athena_response(exc)
        participant.status = SessionParticipantRecord.STATUS_REMOVED
        participant.save(update_fields=['status', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _build_results(record: SessionRecord, actor) -> list[dict]:
    client = _client_for(actor)
    attempts = client.list_all_session_attempts(record.athena_session_id)
    by_athena = profiles_by_athena_ids([UUID(str(item['user_id'])) for item in attempts])
    local_by_user = {
        item.user_id: item
        for item in record.participants.select_related('user__profile')
    }
    ranked = sorted(
        [item for item in attempts if item.get('score') is not None],
        key=lambda item: Decimal(str(item['score'])),
        reverse=True,
    )
    rank_map = {item['attempt_id']: index + 1 for index, item in enumerate(ranked)}
    rows = []
    for item in attempts:
        athena_uid = UUID(str(item['user_id']))
        profile = by_athena.get(athena_uid)
        local = None
        if profile:
            local = local_by_user.get(profile.user_id)
        rows.append({
            'attempt_id': item['attempt_id'],
            'user_id': profile.user_id if profile else None,
            'full_name': (profile.full_name if profile else '') or '—',
            'status': item.get('status'),
            'score': item.get('score'),
            'min_score': item.get('min_score'),
            'max_score': item.get('max_score'),
            'percent': _percent(item.get('score'), item.get('max_score')),
            'rank': rank_map.get(item['attempt_id']),
            'started_at': item.get('started_at'),
            'submitted_at': item.get('submitted_at'),
            'participant_status': local.status if local else None,
        })
    rows.sort(key=lambda row: (row['rank'] is None, row['rank'] or math.inf))
    return rows


class ConsultantSessionResultsView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        try:
            live = _client_for(request.user).get_session(record.athena_session_id)
            _sync_session_status(record, live)
            rows = _build_results(record, request.user)
        except AthenaError as exc:
            return _athena_response(exc)
        payload = _serialize_session(record)
        payload['results'] = rows
        return Response(payload)


class ConsultantSessionResultDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request, session_id: int, user_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(
            SessionRecord, id=session_id, created_by=request.user, school=school
        )
        participant = get_object_or_404(SessionParticipantRecord, session=record, user_id=user_id)
        try:
            rows = _build_results(record, request.user)
            row = next((item for item in rows if item.get('user_id') == user_id), None)
            if row is None or not row.get('attempt_id'):
                return Response({'error': 'تلاشی برای این دانش‌آموز ثبت نشده'}, status=404)
            result = _client_for(request.user).get_attempt_result(row['attempt_id'])
        except AthenaError as exc:
            return _athena_response(exc)
        stats = _answer_stats(list(result.get('answers') or []))
        return Response({
            'session': _serialize_session(record),
            'student': {
                'user_id': user_id,
                'full_name': getattr(participant.user.profile, 'full_name', '') or '',
            },
            'rank': row.get('rank'),
            'percent': _percent(result.get('score'), result.get('max_score')),
            'stats': stats,
            'result': result,
        })


class StudentMyExamSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            SessionParticipantRecord.objects.filter(
                user=request.user,
                status=SessionParticipantRecord.STATUS_ASSIGNED,
            )
            .select_related('session__exam')
            .order_by('-session__start_time')
        )
        live_by_id = {}
        try:
            page = _client_for(request.user).list_my_sessions(limit=100, offset=0)
            for item in page.get('items') or []:
                live_by_id[str(item.get('session_id'))] = item
        except AthenaError:
            live_by_id = {}

        items = []
        for participation in rows:
            session = participation.session
            live = live_by_id.get(str(session.athena_session_id), {})
            if live.get('status'):
                _sync_session_status(session, live)
            items.append(_serialize_session(session, {
                'attempt_id': live.get('attempt_id'),
                'attempt_status': live.get('attempt_status'),
            }))
        return Response({'items': items, 'total': len(items)})


class StudentSessionBookletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id: int):
        record = get_object_or_404(SessionRecord, id=session_id)
        if not _can_access_session_booklet(request.user, record):
            return Response({'error': 'دسترسی به دفترچه مجاز نیست'}, status=403)
        return _booklet_file_response(record.exam.asset)


class StudentStartAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id: int):
        get_object_or_404(
            SessionParticipantRecord,
            session_id=session_id,
            user=request.user,
            status=SessionParticipantRecord.STATUS_ASSIGNED,
        )
        record = SessionRecord.objects.get(id=session_id)
        client = _client_for(request.user)
        try:
            result = client.start_attempt(record.athena_session_id)
        except AthenaError as exc:
            if exc.code != 'attempt_already_exists':
                return _athena_response(exc)
            try:
                page = client.list_my_sessions(limit=100, offset=0)
            except AthenaError as inner:
                return _athena_response(inner)
            live = next(
                (
                    item
                    for item in (page.get('items') or [])
                    if str(item.get('session_id')) == str(record.athena_session_id)
                    and item.get('attempt_id')
                ),
                None,
            )
            if live is None:
                return _athena_response(exc)
            try:
                attempt = client.get_attempt(live['attempt_id'])
            except AthenaError as inner:
                return _athena_response(inner)
            result = {
                'attempt_id': live['attempt_id'],
                'started_at': attempt.get('started_at'),
                'expire_at': attempt.get('expire_at'),
            }
        return Response(result, status=status.HTTP_201_CREATED)


class StudentAttemptDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id: UUID):
        try:
            result = _client_for(request.user).get_attempt(attempt_id)
        except AthenaError as exc:
            return _athena_response(exc)
        return Response(result)


class StudentAttemptProblemsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id: UUID):
        client = _client_for(request.user)
        try:
            items = client.list_all_attempt_problems(attempt_id)
        except AthenaError:
            items = []
            try:
                attempt = client.get_attempt(attempt_id)
                session = SessionRecord.objects.filter(
                    athena_session_id=attempt.get('session_id')
                ).first()
                if session is not None:
                    items = client.list_all_session_problems(session.athena_session_id)
            except AthenaError as exc:
                return _athena_response(exc)
        try:
            answers = client.get_attempt_answers(attempt_id)
        except AthenaError:
            answers = {'answers': []}
        selected = {
            str(item['exam_session_problem_id']): (item.get('response_data') or {}).get('selected_option_id')
            for item in answers.get('answers') or []
        }
        for problem in items:
            problem['selected_option_id'] = selected.get(str(problem.get('id')))
        return Response({'items': items, 'total': len(items)})


class StudentSendAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, attempt_id: UUID):
        payload = {
            'exam_session_problem_id': request.data.get('exam_session_problem_id'),
            'response_data': request.data.get('response_data') or {
                'selected_option_id': request.data.get('selected_option_id'),
            },
        }
        try:
            result = _client_for(request.user).send_answer(attempt_id, payload)
        except AthenaError as exc:
            return _athena_response(exc)
        return Response(result)


class StudentSubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id: UUID):
        try:
            _client_for(request.user).submit_attempt(attempt_id)
        except AthenaError as exc:
            return _athena_response(exc)
        return Response(status=status.HTTP_202_ACCEPTED)


class StudentAttemptResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id: UUID):
        try:
            attempt = _client_for(request.user).get_attempt(attempt_id)
            result = _client_for(request.user).get_attempt_result(attempt_id)
        except AthenaError as exc:
            return _athena_response(exc)
        session = SessionRecord.objects.filter(
            athena_session_id=attempt.get('session_id')
        ).select_related('exam').first()
        stats = _answer_stats(list(result.get('answers') or []))
        rank = None
        if session:
            try:
                rows = _build_results(session, session.created_by)
                mine = next(
                    (row for row in rows if str(row.get('attempt_id')) == str(attempt_id)),
                    None,
                )
                rank = mine.get('rank') if mine else None
            except AthenaError:
                rank = None
        return Response({
            'attempt': attempt,
            'session': _serialize_session(session) if session else None,
            'percent': _percent(result.get('score'), result.get('max_score')),
            'rank': rank,
            'stats': stats,
            'result': result,
        })


class ManagerExamSessionListView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        school, error = _school_or_error(request)
        if error:
            return error
        records = SessionRecord.objects.filter(school=school).select_related('exam', 'created_by')
        items = []
        for record in records:
            try:
                live = _client_for(record.created_by).get_session(record.athena_session_id)
                _sync_session_status(record, live)
            except AthenaError:
                pass
            items.append(_serialize_session(record, {
                'consultant_name': getattr(record.created_by.profile, 'full_name', '') or '',
            }))
        return Response({'items': items, 'total': len(items)})


class ManagerExamSessionResultsView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request, session_id: int):
        school, error = _school_or_error(request)
        if error:
            return error
        record = get_object_or_404(SessionRecord, id=session_id, school=school)
        try:
            live = _client_for(record.created_by).get_session(record.athena_session_id)
            _sync_session_status(record, live)
            rows = _build_results(record, record.created_by)
        except AthenaError as exc:
            return _athena_response(exc)
        payload = _serialize_session(record, {
            'consultant_name': getattr(record.created_by.profile, 'full_name', '') or '',
        })
        payload['results'] = rows
        return Response(payload)
