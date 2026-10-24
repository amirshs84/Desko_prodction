from django.db import migrations

CATEGORIES = [
    {
        "key": "system",
        "title": "سیستمی و امنیتی",
        "description": "اطلاعیه‌های حیاتی حساب کاربری؛ قابل خاموش شدن نیست.",
        "default_priority": "CRITICAL",
        "default_channels": ["PUSH", "REALTIME", "INBOX"],
        "user_configurable": False,
    },
    {
        "key": "exam",
        "title": "آزمون‌ها",
        "description": "شروع و تغییر وضعیت جلسات آزمون.",
        "default_priority": "CRITICAL",
        "default_channels": ["PUSH", "REALTIME", "INBOX"],
        "user_configurable": False,
    },
    {
        "key": "direct_message",
        "title": "پیام‌های مشاور",
        "description": "پیام‌های مستقیم بین مشاور و دانش‌آموز.",
        "default_priority": "HIGH",
        "default_channels": ["PUSH", "REALTIME", "INBOX"],
        "user_configurable": True,
    },
    {
        "key": "plan_update",
        "title": "برنامه‌ی مطالعاتی",
        "description": "تأیید، رد یا تغییر برنامه.",
        "default_priority": "NORMAL",
        "default_channels": ["PUSH", "INBOX"],
        "user_configurable": True,
    },
    {
        "key": "study_reminder",
        "title": "یادآور مطالعه",
        "description": "یادآور شروع بلوک‌های مطالعه (روی خود دستگاه زمان‌بندی می‌شود).",
        "default_priority": "NORMAL",
        "default_channels": ["PUSH"],
        "user_configurable": True,
    },
    {
        "key": "tips",
        "title": "نکته‌ها و پیشنهادها",
        "description": "نکات مطالعه و اطلاعیه‌های غیرفوری.",
        "default_priority": "LOW",
        "default_channels": ["PUSH", "INBOX", "IN_APP"],
        "user_configurable": True,
    },
]

TEMPLATES = [
    {
        "key": "consultant_direct_message",
        "category_id": "direct_message",
        "title": "پیام جدید از {sender_name}",
        "body": "{preview}",
        "content_options": {
            "style": "BIG_TEXT",
            "actions": [
                {"id": "open", "title": "مشاهده", "type": "OPEN"},
                {"id": "later", "title": "بعداً", "type": "DISMISS"},
            ],
        },
    },
    {
        "key": "exam_session_started",
        "category_id": "exam",
        "title": "آزمون «{exam_title}» شروع شد",
        "body": "همین حالا وارد جلسه شوید.",
        "content_options": {
            "style": "BASIC",
            "actions": [{"id": "join", "title": "ورود به آزمون", "type": "OPEN"}],
        },
    },
    {
        "key": "study_block_reminder",
        "category_id": "study_reminder",
        "title": "وقت مطالعه‌ی {subject}",
        "body": "بلوک مطالعه‌ی شما ساعت {start_time} شروع می‌شود.",
        "content_options": {
            "style": "BASIC",
            "actions": [
                {"id": "start", "title": "شروع", "type": "OPEN"},
                {"id": "snooze", "title": "۱۰ دقیقه بعد", "type": "DISMISS"},
            ],
        },
    },
]


def seed(apps, schema_editor):
    Category = apps.get_model("notifications", "CategoryModel")
    Template = apps.get_model("notifications", "TemplateModel")
    for data in CATEGORIES:
        Category.objects.update_or_create(key=data["key"], defaults=data)
    for data in TEMPLATES:
        Template.objects.update_or_create(
            key=data["key"], locale="fa", defaults={**data, "locale": "fa"}
        )


def unseed(apps, schema_editor):
    apps.get_model("notifications", "TemplateModel").objects.filter(
        key__in=[t["key"] for t in TEMPLATES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("notifications", "0002_rewrite_notification_module")]

    operations = [migrations.RunPython(seed, unseed)]
