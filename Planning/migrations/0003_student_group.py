# فاز M1 اپ Planning: گروه‌های دانش‌آموزی مشاور.
# عضویت در جدول جداگانه است تا یک دانش‌آموز بتواند در چند گروه باشد و یکتایی
# عضویت را دیتابیس تضمین کند. نام گروه به‌ازای هر مشاور یکتاست.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Planning', '0002_calendar_event_domain_fields'),
        ('api', '0017_remove_calendarevent_from_api'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StudentGroupModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='نام گروه')),
                ('description', models.TextField(blank=True, default='', verbose_name='توضیحات')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('consultant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_groups', to=settings.AUTH_USER_MODEL, verbose_name='مشاور')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_groups', to='api.school', verbose_name='مدرسه')),
            ],
            options={
                'verbose_name': 'گروه دانش\u200cآموزی',
                'verbose_name_plural': 'گروه\u200cهای دانش\u200cآموزی',
                'db_table': 'planning_studentgroup',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='StudentGroupMemberModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planning_group_memberships', to=settings.AUTH_USER_MODEL, verbose_name='دانش\u200cآموز')),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='Planning.studentgroupmodel', verbose_name='گروه')),
            ],
            options={
                'verbose_name': 'عضویت گروه',
                'verbose_name_plural': 'عضویت\u200cهای گروه',
                'db_table': 'planning_studentgroupmember',
            },
        ),
        migrations.AddIndex(
            model_name='studentgroupmodel',
            index=models.Index(fields=['school', 'consultant'], name='planning_grp_school_idx'),
        ),
        migrations.AddConstraint(
            model_name='studentgroupmodel',
            constraint=models.UniqueConstraint(fields=('consultant', 'name'), name='unique_group_name_per_consultant'),
        ),
        migrations.AddIndex(
            model_name='studentgroupmembermodel',
            index=models.Index(fields=['student'], name='planning_grpmem_student_idx'),
        ),
        migrations.AddConstraint(
            model_name='studentgroupmembermodel',
            constraint=models.UniqueConstraint(fields=('group', 'student'), name='unique_student_per_planning_group'),
        ),
    ]
