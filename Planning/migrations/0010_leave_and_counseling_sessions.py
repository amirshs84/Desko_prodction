# Generated manually for consultant leave settings and counseling sessions.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Planning', '0009_proposal_block_decisions_and_notice'),
        ('api', '0017_remove_calendarevent_from_api'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='consultantpreferencesmodel',
            name='on_leave',
            field=models.BooleanField(default=False, verbose_name='در مرخصی'),
        ),
        migrations.AddField(
            model_name='consultantpreferencesmodel',
            name='reserve_slots',
            field=models.PositiveSmallIntegerField(default=3, verbose_name='تعداد نوبت خالی'),
        ),
        migrations.AddField(
            model_name='consultantpreferencesmodel',
            name='smart_alerts',
            field=models.JSONField(blank=True, default=dict, verbose_name='هشدارهای هوشمند'),
        ),
        migrations.CreateModel(
            name='CounselingSessionModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=80, verbose_name='موضوع جلسه')),
                ('starts_at', models.DateTimeField(verbose_name='شروع جلسه')),
                ('status', models.CharField(
                    choices=[
                        ('scheduled', 'برنامه‌ریزی شده'),
                        ('in_progress', 'در حال برگزاری'),
                        ('held', 'برگزار شده'),
                        ('cancelled', 'لغو شده'),
                    ],
                    default='scheduled',
                    max_length=16,
                    verbose_name='وضعیت',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('consultant', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planning_counseling_sessions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='مشاور',
                )),
                ('school', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planning_counseling_sessions',
                    to='api.school',
                    verbose_name='مدرسه',
                )),
                ('student', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planning_counseling_sessions_as_student',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='دانش‌آموز',
                )),
            ],
            options={
                'verbose_name': 'جلسه مشاوره',
                'verbose_name_plural': 'جلسات مشاوره',
                'db_table': 'planning_counselingsession',
                'ordering': ['starts_at', 'id'],
                'indexes': [
                    models.Index(fields=['consultant', 'starts_at'], name='planning_csess_day_idx'),
                    models.Index(fields=['consultant', 'student', '-starts_at'], name='planning_csess_stu_idx'),
                ],
            },
        ),
    ]
