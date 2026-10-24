"""احراز WebSocket با JWT در query string (``/ws/notifications/?token=...``).

مرورگر نمی‌تواند هدر Authorization روی WebSocket بفرستد؛ پس توکن access در query
می‌آید. اگر توکن نبود، کاربرِ session (AuthMiddlewareStack) دست نمی‌خورد.
"""
from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware


@database_sync_to_async
def _user_from_token(raw: str):
    from django.contrib.auth.models import AnonymousUser
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

    auth = JWTAuthentication()
    try:
        return auth.get_user(auth.get_validated_token(raw))
    except (InvalidToken, TokenError, Exception):  # noqa: BLE001
        return AnonymousUser()


class JwtQueryAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token = parse_qs(scope.get("query_string", b"").decode()).get("token", [None])[0]
        if token:
            scope = dict(scope)
            scope["user"] = await _user_from_token(token)
        return await super().__call__(scope, receive, send)
