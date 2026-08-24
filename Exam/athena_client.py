from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx
from django.conf import settings

from .identity import mint_athena_token


class AthenaError(Exception):
    def __init__(self, status_code: int, code: str, detail: Any = None) -> None:
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(code)


class AthenaClient:
    def __init__(self, athena_user_id: UUID, *, timeout: float = 30.0) -> None:
        self._user_id = athena_user_id
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {mint_athena_token(self._user_id)}',
            'Accept': 'application/json',
        }

    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f'{settings.ATHENA_BASE_URL}{path}'
        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers(),
                timeout=self._timeout,
                **kwargs,
            )
        except httpx.HTTPError as exc:
            raise AthenaError(503, 'athena_unavailable', str(exc)) from exc

        if response.status_code >= 400:
            code = 'athena_error'
            try:
                payload = response.json()
            except ValueError:
                payload = response.text
            if isinstance(payload, dict):
                raw_code = payload.get('code')
                raw_detail = payload.get('detail')
                if isinstance(raw_code, str) and raw_code:
                    code = raw_code
                elif isinstance(raw_detail, str) and raw_detail:
                    code = raw_detail
                elif isinstance(raw_detail, list) and raw_detail:
                    first = raw_detail[0]
                    if isinstance(first, dict):
                        code = str(first.get('msg') or first.get('type') or code)
            raise AthenaError(response.status_code, str(code), payload)

        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def create_exam(self, payload: dict) -> dict:
        return self._request('POST', '/api/v1/exams', json=payload)

    def list_exams(self, *, limit: int = 50, offset: int = 0) -> dict:
        return self._request('GET', '/api/v1/exams', params={'limit': limit, 'offset': offset})

    def get_exam(self, exam_id: UUID) -> dict:
        return self._request('GET', f'/api/v1/exams/{exam_id}')

    def create_session(self, exam_id: UUID, payload: dict) -> dict:
        return self._request('POST', f'/api/v1/exams/{exam_id}/sessions', json=payload)

    def list_exam_sessions(self, exam_id: UUID, *, limit: int = 50, offset: int = 0) -> dict:
        return self._request(
            'GET',
            f'/api/v1/exams/{exam_id}/sessions',
            params={'limit': limit, 'offset': offset},
        )

    def get_session(self, session_id: UUID) -> dict:
        return self._request('GET', f'/api/v1/sessions/{session_id}')

    def update_session(self, session_id: UUID, payload: dict) -> None:
        self._request('PATCH', f'/api/v1/sessions/{session_id}', json=payload)

    def add_participants(self, session_id: UUID, user_ids: list[UUID]) -> dict:
        return self._request(
            'POST',
            f'/api/v1/sessions/{session_id}/participants',
            json={'user_ids': [str(value) for value in user_ids]},
        )

    def remove_participant(self, session_id: UUID, user_id: UUID) -> None:
        self._request('DELETE', f'/api/v1/sessions/{session_id}/participants/{user_id}')

    def list_participants(self, session_id: UUID, *, limit: int = 100, offset: int = 0) -> dict:
        return self._request(
            'GET',
            f'/api/v1/sessions/{session_id}/participants',
            params={'limit': limit, 'offset': offset},
        )

    def list_my_sessions(self, *, limit: int = 50, offset: int = 0) -> dict:
        return self._request('GET', '/api/v1/me/sessions', params={'limit': limit, 'offset': offset})

    def start_attempt(self, session_id: UUID) -> dict:
        return self._request('POST', f'/api/v1/sessions/{session_id}/attempts')

    def send_answer(self, attempt_id: UUID, payload: dict) -> dict:
        return self._request('PUT', f'/api/v1/attempts/{attempt_id}/answers', json=payload)

    def submit_attempt(self, attempt_id: UUID) -> None:
        self._request('POST', f'/api/v1/attempts/{attempt_id}/submit')

    def get_attempt(self, attempt_id: UUID) -> dict:
        return self._request('GET', f'/api/v1/attempts/{attempt_id}')

    def get_attempt_result(self, attempt_id: UUID) -> dict:
        return self._request('GET', f'/api/v1/attempts/{attempt_id}/result')

    def get_attempt_answers(self, attempt_id: UUID) -> dict:
        return self._request('GET', f'/api/v1/attempts/{attempt_id}/answers')

    def get_attempt_problems(self, attempt_id: UUID, *, limit: int = 100, offset: int = 0) -> dict:
        return self._request(
            'GET',
            f'/api/v1/attempts/{attempt_id}/problems',
            params={'limit': limit, 'offset': offset},
        )

    def get_session_problems(self, session_id: UUID, *, limit: int = 100, offset: int = 0) -> dict:
        return self._request(
            'GET',
            f'/api/v1/sessions/{session_id}/problems',
            params={'limit': limit, 'offset': offset},
        )

    def list_all_session_problems(self, session_id: UUID) -> list[dict]:
        items: list[dict] = []
        offset = 0
        while True:
            page = self.get_session_problems(session_id, limit=100, offset=offset)
            chunk = list(page.get('items') or [])
            items.extend(chunk)
            if offset + len(chunk) >= int(page.get('total') or 0) or not chunk:
                break
            offset += 100
        return items

    def list_session_attempts(self, session_id: UUID, *, limit: int = 100, offset: int = 0) -> dict:
        return self._request(
            'GET',
            f'/api/v1/sessions/{session_id}/attempts',
            params={'limit': limit, 'offset': offset},
        )

    def list_all_session_attempts(self, session_id: UUID) -> list[dict]:
        items: list[dict] = []
        offset = 0
        while True:
            page = self.list_session_attempts(session_id, limit=100, offset=offset)
            chunk = list(page.get('items') or [])
            items.extend(chunk)
            if offset + len(chunk) >= int(page.get('total') or 0) or not chunk:
                break
            offset += 100
        return items

    def list_all_attempt_problems(self, attempt_id: UUID) -> list[dict]:
        items: list[dict] = []
        offset = 0
        while True:
            page = self.get_attempt_problems(attempt_id, limit=100, offset=offset)
            chunk = list(page.get('items') or [])
            items.extend(chunk)
            if offset + len(chunk) >= int(page.get('total') or 0) or not chunk:
                break
            offset += 100
        return items
