from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from django.conf import settings
from django.contrib.auth.models import User

from api.models import UserProfile


def ensure_athena_id(user: User) -> uuid.UUID:
    try:
        profile = user.profile
    except UserProfile.DoesNotExist as exc:
        raise ValueError('پروفایل کاربر یافت نشد') from exc
    if profile.athena_id:
        return profile.athena_id
    profile.athena_id = uuid.uuid4()
    profile.save(update_fields=['athena_id'])
    return profile.athena_id


def load_athena_private_key() -> str:
    key = (settings.ATHENA_JWT_PRIVATE_KEY or '').strip()
    if key:
        return key.replace('\\n', '\n')
    path = Path(settings.ATHENA_JWT_PRIVATE_KEY_FILE)
    return path.read_text(encoding='utf-8')


def mint_athena_token(athena_user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(athena_user_id),
        'iss': settings.ATHENA_JWT_ISSUER,
        'aud': settings.ATHENA_JWT_AUDIENCE,
        'iat': now,
        'nbf': now - timedelta(seconds=5),
        'exp': now + timedelta(seconds=settings.ATHENA_JWT_TTL_SECONDS),
    }
    return jwt.encode(
        payload,
        load_athena_private_key(),
        algorithm=settings.ATHENA_JWT_ALGORITHM,
    )


def profiles_by_athena_ids(athena_ids) -> dict[uuid.UUID, UserProfile]:
    ids = [value for value in athena_ids if value]
    if not ids:
        return {}
    return {
        profile.athena_id: profile
        for profile in UserProfile.objects.filter(athena_id__in=ids).select_related('user')
    }
