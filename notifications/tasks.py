from celery import shared_task
from django.contrib.auth import get_user_model
from notifications.models import NotificationTemplate, NotificationEvent, UserNotification, NotificationTrackingLog
import json
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def process_notification_event(user_ids, template_name, context, override_payload):
    """
    این تسک تمام رویدادهای سیستم را مدیریت کرده، لاگ می‌اندازد و 
    به کانال‌های مختلف (وب‌سوکت، پوش و غیره) پیام می‌فرستد.
    """
    try:
        template = NotificationTemplate.objects.get(name=template_name)
    except NotificationTemplate.DoesNotExist:
        logger.error(f"Template {template_name} does not exist.")
        return

    # Create Event
    event = NotificationEvent.objects.create(
        template=template,
        context_data=context,
        override_payload=override_payload
    )

    # Create UserNotifications
    user_notifications = []
    for uid in user_ids:
        user_notifications.append(
            UserNotification(user_id=uid, event=event, is_read=False)
        )
    
    created_uns = UserNotification.objects.bulk_create(user_notifications)

    # Log SENT status for Analytics
    logs = []
    for un in created_uns:
        logs.append(
            NotificationTrackingLog(user_notification=un, status='SENT', metadata={"channel": "ALL"})
        )
    NotificationTrackingLog.objects.bulk_create(logs)

    # TODO: 4a. Broadcast to WS channel (channels)
    # TODO: 4b. Send OS Push (WebPush/FCM)
    # TODO: 4c. Send SMS/Email if configured
    
    return f"Processed event {event.id} for {len(user_ids)} users."

@shared_task
def buffer_tracking_log(user_notification_id, status, metadata):
    """
    این تسک به صورت مستقل وضعیت‌ها را ثبت می‌کند.
    در ترافیک خیلی سنگین، این متد می‌تواند ریکوئست‌ها را ابتدا در 
    cache.client.lpush ریخته و یک Celery Beat بصورت دوره‌ای در دیتابیس اینسرت کند.
    اما برای شروع مستقیماً ذخیره می‌شود.
    """
    try:
        un = UserNotification.objects.get(id=user_notification_id)
        NotificationTrackingLog.objects.create(
            user_notification=un,
            status=status,
            metadata=metadata
        )
    except Exception as e:
        logger.error(f"Error logging status: {e}")
