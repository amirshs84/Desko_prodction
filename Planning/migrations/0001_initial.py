# Generated manually as part of moving CalendarEvent from `api` to the new `Planning` app.
# The physical table (renamed to `planning_calendarevent` in api.migrations.0016) already
# exists with all existing data, so only the migration *state* is (re)created here —
# no database operations are performed.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('api', '0017_remove_calendarevent_from_api'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='CalendarEvent',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('client_id', models.CharField(max_length=64, verbose_name='شناسه کلاینت')),
                        ('jy', models.IntegerField(verbose_name='سال شمسی')),
                        ('jm', models.IntegerField(verbose_name='ماه شمسی')),
                        ('jd', models.IntegerField(verbose_name='روز شمسی')),
                        ('title', models.CharField(max_length=300, verbose_name='عنوان')),
                        ('description', models.TextField(blank=True, verbose_name='توضیحات')),
                        ('start_minutes', models.IntegerField(default=0, verbose_name='دقیقه شروع از نیمه\u200cشب')),
                        ('end_minutes', models.IntegerField(default=1440, verbose_name='دقیقه پایان از نیمه\u200cشب')),
                        ('color', models.CharField(default='#10b981', max_length=20, verbose_name='رنگ')),
                        ('all_day', models.BooleanField(default=False, verbose_name='تمام روز')),
                        ('group_id', models.CharField(blank=True, default='', help_text='رویدادهای ایجادشده با تکرار، این شناسه مشترک دارند', max_length=64, verbose_name='شناسه گروه')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='calendar_events', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'رویداد تقویم',
                        'verbose_name_plural': 'رویدادهای تقویم',
                        'ordering': ['jy', 'jm', 'jd', 'start_minutes'],
                        'db_table': 'planning_calendarevent',
                    },
                ),
                migrations.AddConstraint(
                    model_name='calendarevent',
                    constraint=models.UniqueConstraint(fields=('user', 'client_id'), name='unique_calendar_event_per_user'),
                ),
            ],
            database_operations=[],
        ),
    ]
