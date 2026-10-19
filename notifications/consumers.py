import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # بررسی احراز هویت (در پروژه‌های عملی معمولاً با میان‌افزار JWT هندل می‌شود)
        # در صورتی که کاربر ناشناس باشد اتصال قطع می‌شود
        if getattr(self.scope.get('user', None), 'is_anonymous', True):
            await self.close()
            return
            
        # ساخت یک گروه یکتا برای هر کاربر
        self.user_group_name = f"user_{self.scope['user'].id}"
        
        # اتصال به گروه کاربری در ردیس
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # خروج از گروه در زمان قطعی اتصال
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    # تابعی که توسط channel_layer برای ارسال پیام به این کانال فراخوانی می‌شود
    async def notification_message(self, event):
        payload = event['payload']

        # ارسال پیام (Payload غنی) به سمت کلاینت از طریق وب‌سوکت
        await self.send(text_data=json.dumps(payload))
