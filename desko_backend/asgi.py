import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'desko_backend.settings')

# فراخوانی Setup جنگو قبل از لود شدن روت‌های Channels
django.setup()
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from notifications.interfaces.realtime.auth import JwtQueryAuthMiddleware
from notifications.interfaces.realtime.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # کلاینت‌ها JWT دارند نه session؛ توکن با ?token= فرستاده می‌شود و در نبودش session بررسی می‌شود.
    "websocket": AuthMiddlewareStack(
        JwtQueryAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
