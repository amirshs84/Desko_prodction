from notifications.tasks import process_notification_event, buffer_tracking_log

def dispatch_notification(users, template_name, context=None, override_payload=None):
    """
    سرویس اصلی برای ارسال نوتیفیکیشن.
    سایر ماژول‌های سیستم فقط با این متد درگیر می‌شوند.
    users: لیستی از آبجکت‌های User یا لیست user_id ها.
    """
    user_ids = [u.id if hasattr(u, 'id') else u for u in users]
    
    # اجرای تسک سلری در بک‌گراند بدون بلاک کردن ریسپانس کاربر
    process_notification_event.delay(
        user_ids=user_ids,
        template_name=template_name,
        context=context or {},
        override_payload=override_payload or {}
    )

def log_notification_action(user_notification_id, status, metadata=None):
    """
    ثبت رویدادهای تحویل و کلیک و ارسال به بافر ردیس.
    در این متد API کلاینت رویداد را به تسک سلری می‌سپارد تا در اسکیل بالا دیتابیس درگیر نشود.
    """
    buffer_tracking_log.delay(user_notification_id, status, metadata or {})
