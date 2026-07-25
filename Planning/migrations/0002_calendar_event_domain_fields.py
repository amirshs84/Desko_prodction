# فاز M0 اپ Planning:
#   1. تغییر نام مدل به CalendarEventModel (کنوانسیون لایه‌ی persistence). چون
#      db_table صریح و ثابت است، Django هیچ DDL ای اجرا نمی‌کند و فقط state و
#      ContentType به‌روز می‌شوند.
#   2. افزودن فیلدهای دامنه‌ای: kind (ثابت/قابل‌تغییر)، origin (منشأ)، date (آینه‌ی
#      میلادی برای کوئری بازه‌ای) و version (کنترل همزمانی).
#   3. پرکردن مقدار date برای رکوردهای موجود و سالم‌سازی بازه‌های زمانی نامعتبر،
#      پیش از فعال کردن قید CHECK.
#
# تبدیل تاریخ به‌صورت درون‌خطی نوشته شده (نه import از کد اپ) تا این مایگریشن با
# تغییرات آینده‌ی کد نشکند.

from django.db import migrations, models

BATCH_SIZE = 500
MINUTES_IN_DAY = 1440
MIN_BLOCK_MINUTES = 15


def _is_gregorian_leap(gy):
    return (gy % 4 == 0 and gy % 100 != 0) or gy % 400 == 0


def _jalali_to_gregorian(jy, jm, jd):
    if jy > 979:
        gy = 1600
        jy -= 979
    else:
        gy = 621
    days = (
        365 * jy
        + (jy // 33) * 8
        + (jy % 33 + 3) // 4
        + 78
        + jd
        + ((jm - 1) * 31 if jm < 7 else (jm - 7) * 30 + 186)
    )
    gy += 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    month_lengths = (
        31, 29 if _is_gregorian_leap(gy) else 28, 31, 30, 31, 30,
        31, 31, 30, 31, 30, 31,
    )
    gm = 0
    while gm < 12 and gd > month_lengths[gm]:
        gd -= month_lengths[gm]
        gm += 1
    return gy, gm + 1, gd


def backfill(apps, schema_editor):
    import datetime

    CalendarEvent = apps.get_model('Planning', 'CalendarEventModel')
    pending = []
    for row in CalendarEvent.objects.all().iterator(chunk_size=BATCH_SIZE):
        gy, gm, gd = _jalali_to_gregorian(row.jy, row.jm, row.jd)
        row.date = datetime.date(gy, gm, gd)

        start = max(0, min(row.start_minutes, MINUTES_IN_DAY - MIN_BLOCK_MINUTES))
        end = min(MINUTES_IN_DAY, row.end_minutes)
        if end <= start:
            end = min(MINUTES_IN_DAY, start + MIN_BLOCK_MINUTES)
        row.start_minutes, row.end_minutes = start, end

        pending.append(row)
        if len(pending) >= BATCH_SIZE:
            CalendarEvent.objects.bulk_update(pending, ['date', 'start_minutes', 'end_minutes'])
            pending = []
    if pending:
        CalendarEvent.objects.bulk_update(pending, ['date', 'start_minutes', 'end_minutes'])


class Migration(migrations.Migration):

    dependencies = [
        ('Planning', '0001_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='CalendarEvent',
            new_name='CalendarEventModel',
        ),
        migrations.AddField(
            model_name='calendareventmodel',
            name='date',
            field=models.DateField(
                null=True,
                help_text='آینه‌ی میلادی همان روز شمسی؛ فقط برای کوئری بازه‌ای و مرتب‌سازی',
                verbose_name='تاریخ میلادی معادل',
            ),
        ),
        migrations.AddField(
            model_name='calendareventmodel',
            name='kind',
            field=models.CharField(
                choices=[('mutable', 'قابل تغییر'), ('immutable', 'ثابت (مدرسه)')],
                default='mutable',
                help_text='رویداد ثابت مدرسه تحت هیچ شرایطی توسط مشاور، دانش‌آموز یا الگوریتم تغییر نمی‌کند',
                max_length=16,
                verbose_name='جنس رویداد',
            ),
        ),
        migrations.AddField(
            model_name='calendareventmodel',
            name='origin',
            field=models.CharField(
                choices=[
                    ('student', 'دانش‌آموز'),
                    ('consultant', 'مشاور'),
                    ('algorithm', 'موتور برنامه‌ریزی'),
                    ('school', 'مدرسه'),
                ],
                default='student',
                max_length=16,
                verbose_name='منشأ ایجاد',
            ),
        ),
        migrations.AddField(
            model_name='calendareventmodel',
            name='version',
            field=models.PositiveIntegerField(
                default=1,
                help_text='شماره‌ی نسخه برای کنترل همزمانی خوش‌بینانه',
                verbose_name='نسخه',
            ),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='calendareventmodel',
            name='date',
            field=models.DateField(
                help_text='آینه‌ی میلادی همان روز شمسی؛ فقط برای کوئری بازه‌ای و مرتب‌سازی',
                verbose_name='تاریخ میلادی معادل',
            ),
        ),
        migrations.AddIndex(
            model_name='calendareventmodel',
            index=models.Index(fields=['user', 'date'], name='planning_evt_user_date_idx'),
        ),
        migrations.AddIndex(
            model_name='calendareventmodel',
            index=models.Index(fields=['group_id'], name='planning_evt_group_idx'),
        ),
        migrations.AddConstraint(
            model_name='calendareventmodel',
            constraint=models.CheckConstraint(
                check=models.Q(
                    ('start_minutes__gte', 0),
                    ('end_minutes__lte', 1440),
                    ('start_minutes__lt', models.F('end_minutes')),
                ),
                name='planning_event_valid_time_range',
            ),
        ),
    ]
