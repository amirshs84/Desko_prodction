# فاز M3: اجرای برنامه‌ریزی گروهی، پیشنهادهای دانش‌آموز، و اسنپ‌شات تقویم.
# بلوک‌های پیشنهادی به‌صورت JSON روی پیشنهاد ذخیره می‌شوند؛ اسنپ‌شات هم یک سند
# JSON از کل تقویم است (نه ردیف‌های جدا) چون فقط برای بازگردانی کامل خوانده می‌شود.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Planning', '0003_student_group'),
        ('api', '0017_remove_calendarevent_from_api'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlanRunModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mode', models.CharField(choices=[('suggested', 'پیشنهادی'), ('forced', 'قطعی')], max_length=16, verbose_name='نحوه انتشار')),
                ('intensity', models.CharField(max_length=16, verbose_name='سطح فشردگی')),
                ('group_tag', models.CharField(help_text='روی همه\u200cی رویدادهای ساخته\u200cشده از این اجرا می\u200cنشیند (حذف/بازگردانی دسته\u200cای)', max_length=64, unique=True, verbose_name='برچسب رویدادها')),
                ('start_date', models.DateField(verbose_name='شروع بازه')),
                ('end_date', models.DateField(verbose_name='پایان بازه')),
                ('start_jy', models.IntegerField()),
                ('start_jm', models.IntegerField()),
                ('start_jd', models.IntegerField()),
                ('end_jy', models.IntegerField()),
                ('end_jm', models.IntegerField()),
                ('end_jd', models.IntegerField()),
                ('summary', models.JSONField(default=dict, verbose_name='خلاصه اجرا')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('consultant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_runs', to=settings.AUTH_USER_MODEL, verbose_name='مشاور')),
                ('group', models.ForeignKey(blank=True, help_text='اگر برنامه روی فهرست دستی دانش\u200cآموزان اجرا شده باشد، خالی است', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='plan_runs', to='Planning.studentgroupmodel', verbose_name='گروه')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_runs', to='api.school', verbose_name='مدرسه')),
            ],
            options={
                'verbose_name': 'اجرای برنامه\u200cریزی',
                'verbose_name_plural': 'اجراهای برنامه\u200cریزی',
                'db_table': 'planning_planrun',
                'ordering': ['-created_at', '-id'],
            },
        ),
        migrations.CreateModel(
            name='PlanProposalModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'در انتظار پاسخ'), ('accepted', 'پذیرفته\u200cشده'), ('rejected', 'ردشده')], default='pending', max_length=16, verbose_name='وضعیت')),
                ('group_tag', models.CharField(max_length=64, verbose_name='برچسب رویدادها')),
                ('blocks', models.JSONField(default=list, verbose_name='بلوک\u200cهای پیشنهادی')),
                ('shortfall_minutes', models.PositiveIntegerField(default=0, verbose_name='کسری زمان')),
                ('applied_blocks', models.PositiveIntegerField(default=0, verbose_name='بلوک\u200cهای اعمال\u200cشده')),
                ('responded_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان پاسخ')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_proposals', to=settings.AUTH_USER_MODEL, verbose_name='دانش\u200cآموز')),
                ('plan_run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proposals', to='Planning.planrunmodel', verbose_name='اجرای برنامه')),
            ],
            options={
                'verbose_name': 'پیشنهاد برنامه',
                'verbose_name_plural': 'پیشنهادهای برنامه',
                'db_table': 'planning_planproposal',
                'ordering': ['-created_at', '-id'],
            },
        ),
        migrations.CreateModel(
            name='CalendarSnapshotModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(max_length=32, verbose_name='علت ثبت نسخه')),
                ('plan_run_id', models.CharField(blank=True, default='', max_length=64, verbose_name='شناسه اجرای برنامه')),
                ('payload', models.JSONField(default=list, verbose_name='رویدادهای تقویم')),
                ('event_count', models.PositiveIntegerField(default=0, verbose_name='تعداد رویداد')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='calendar_snapshots', to=settings.AUTH_USER_MODEL, verbose_name='دانش\u200cآموز')),
            ],
            options={
                'verbose_name': 'نسخه تقویم',
                'verbose_name_plural': 'نسخه\u200cهای تقویم',
                'db_table': 'planning_calendarsnapshot',
                'ordering': ['-created_at', '-id'],
                'indexes': [models.Index(fields=['user', '-created_at'], name='planning_snap_user_idx')],
            },
        ),
        migrations.AddIndex(
            model_name='planrunmodel',
            index=models.Index(fields=['consultant', '-created_at'], name='planning_run_cons_idx'),
        ),
        migrations.AddIndex(
            model_name='planproposalmodel',
            index=models.Index(fields=['student', 'status'], name='planning_prop_student_idx'),
        ),
        migrations.AddConstraint(
            model_name='planproposalmodel',
            constraint=models.UniqueConstraint(fields=('plan_run', 'student'), name='unique_proposal_per_run_student'),
        ),
    ]
