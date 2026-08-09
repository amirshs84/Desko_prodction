# Generated manually for consultant preferences

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Planning', '0006_consultant_notes_and_messages'),
        ('api', '0017_remove_calendarevent_from_api'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ConsultantPreferencesModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quick_replies', models.JSONField(blank=True, default=list, verbose_name='پاسخ\u200cهای سریع')),
                ('visible_roster_columns', models.JSONField(blank=True, default=list, verbose_name='ستون\u200cهای فهرست دانش\u200cآموزان')),
                ('notifications', models.JSONField(blank=True, default=dict, verbose_name='نوتیفیکیشن\u200cها')),
                ('working_hours', models.JSONField(blank=True, default=dict, verbose_name='ساعات کاری')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('consultant', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planning_preferences',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='مشاور',
                )),
                ('school', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planning_consultant_preferences',
                    to='api.school',
                    verbose_name='مدرسه',
                )),
            ],
            options={
                'verbose_name': 'ترجیحات مشاور',
                'verbose_name_plural': 'ترجیحات مشاوران',
                'db_table': 'planning_consultantpreferences',
            },
        ),
    ]
