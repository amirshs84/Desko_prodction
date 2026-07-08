import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class SkyroomError(Exception):
    """خطای سرویس اسکای‌روم."""

    def __init__(self, message: str, *, error_code: int | None = None):
        self.error_code = error_code
        super().__init__(message)


@dataclass
class SkyroomResponse:
    ok: bool
    result: Any = None
    error_code: int | None = None
    error_message: str | None = None


class SkyroomClient:
    """کلاینت REST وب‌سرویس اسکای‌روم."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        timeout: float | None = None,
        connect_timeout: float | None = None,
    ):
        self.api_key = api_key or getattr(settings, 'SKYROOM_API_KEY', '')
        if not self.api_key:
            raise SkyroomError('کلید API اسکای‌روم تنظیم نشده است')

        base = getattr(settings, 'SKYROOM_API_BASE_URL', 'https://www.skyroom.online/skyroom/api')
        self.api_url = f'{base.rstrip("/")}/{self.api_key}'
        self.timeout = timeout or float(getattr(settings, 'SKYROOM_TIMEOUT', '30'))
        self.connect_timeout = connect_timeout or float(
            getattr(settings, 'SKYROOM_CONNECT_TIMEOUT', '10')
        )

    def call(self, action: str, params: dict | None = None) -> Any:
        payload: dict[str, Any] = {'action': action}
        if params:
            payload['params'] = params

        try:
            with httpx.Client(
                timeout=httpx.Timeout(self.timeout, connect=self.connect_timeout),
            ) as client:
                response = client.post(
                    self.api_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                )
        except httpx.TimeoutException as exc:
            logger.exception('Skyroom timeout for action=%s', action)
            raise SkyroomError('اتصال به اسکای‌روم با تایم‌اوت مواجه شد') from exc
        except httpx.RequestError as exc:
            logger.exception('Skyroom network error for action=%s', action)
            raise SkyroomError('خطای شبکه در ارتباط با اسکای‌روم') from exc

        if response.status_code != 200:
            logger.error(
                'Skyroom HTTP error action=%s status=%s body=%s',
                action,
                response.status_code,
                response.text[:500],
            )
            raise SkyroomError(
                f'خطای HTTP از اسکای‌روم (کد {response.status_code})',
            )

        try:
            data = response.json()
        except ValueError as exc:
            logger.error('Skyroom invalid JSON action=%s body=%s', action, response.text[:500])
            raise SkyroomError('پاسخ نامعتبر از اسکای‌روم') from exc

        parsed = SkyroomResponse(
            ok=bool(data.get('ok')),
            result=data.get('result'),
            error_code=data.get('error_code'),
            error_message=data.get('error_message'),
        )
        if not parsed.ok:
            logger.warning(
                'Skyroom API error action=%s code=%s message=%s',
                action,
                parsed.error_code,
                parsed.error_message,
            )
            raise SkyroomError(
                parsed.error_message or 'درخواست اسکای‌روم با خطا مواجه شد',
                error_code=parsed.error_code,
            )
        return parsed.result

    def get_room(self, *, room_id: int | None = None, name: str | None = None) -> dict:
        params: dict[str, Any] = {}
        if room_id is not None:
            params['room_id'] = room_id
        if name:
            params['name'] = name
        return self.call('getRoom', params)

    def create_room(
        self,
        *,
        name: str,
        title: str,
        max_users: int | None = None,
        guest_login: bool = False,
        op_login_first: bool = True,
        service_id: int | None = None,
    ) -> int:
        params: dict[str, Any] = {
            'name': name,
            'title': title,
            'guest_login': guest_login,
            'op_login_first': op_login_first,
        }
        if max_users is not None:
            params['max_users'] = max_users
        if service_id is not None:
            params['service_id'] = service_id
        return int(self.call('createRoom', params))

    def update_room(self, room_id: int, **fields: Any) -> int:
        params = {'room_id': room_id, **fields}
        return int(self.call('updateRoom', params))

    def get_room_url(self, room_id: int, *, language: str = 'fa') -> str:
        return str(self.call('getRoomUrl', {'room_id': room_id, 'language': language}))

    def create_login_url(
        self,
        *,
        room_id: int,
        user_id: str,
        nickname: str,
        access: int = 1,
        concurrent: int = 1,
        language: str = 'fa',
        ttl: int | None = None,
    ) -> str:
        params: dict[str, Any] = {
            'room_id': room_id,
            'user_id': user_id,
            'nickname': nickname,
            'access': access,
            'concurrent': concurrent,
            'language': language,
        }
        if ttl is not None:
            params['ttl'] = ttl
        return str(self.call('createLoginUrl', params))


def slugify_room_name(value: str, *, max_length: int = 128) -> str:
    """تبدیل به نام لاتین مجاز برای اتاق اسکای‌روم."""
    slug = value.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = re.sub(r'-{2,}', '-', slug).strip('-')
    if not slug:
        slug = 'room'
    return slug[:max_length]


def build_room_name(school_id: int, school_class_id: int, code: str) -> str:
    code_slug = slugify_room_name(code, max_length=40)
    name = f'desko-s{school_id}-c{school_class_id}-{code_slug}'
    return name[:128]


def build_skyroom_user_id(user_id: int) -> str:
    return f'desko-u{user_id}'[:32]
