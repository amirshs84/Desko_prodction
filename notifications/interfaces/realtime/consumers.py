import json

from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    """هر کاربر در گروه ``user_{id}``؛ پیام‌ها: ``{"event": "notification" | "in_app", "payload": {...}}``."""

    async def connect(self):
        user = self.scope.get("user")
        if user is None or user.is_anonymous:
            await self.close(code=4401)
            return
        self.user_group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # keepalive کلاینت؛ پروکسی‌ها اتصال بی‌کار را می‌بندند
        if text_data == "ping":
            await self.send(text_data="pong")

    async def notification_message(self, event):
        await self.send(
            text_data=json.dumps(
                {"event": event.get("event", "notification"), "payload": event["payload"]},
                ensure_ascii=False,
            )
        )
