from django.db import migrations, models
import django.db.models.deletion
import uuid
import Exam.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('api', '0019_userprofile_athena_id'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExamAsset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to=Exam.models.booklet_upload_to)),
                ('original_name', models.CharField(max_length=255)),
                ('content_type', models.CharField(default='application/pdf', max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exam_assets', to='auth.user')),
            ],
            options={
                'verbose_name': 'فایل دفترچه آزمون',
                'verbose_name_plural': 'فایل‌های دفترچه آزمون',
            },
        ),
        migrations.CreateModel(
            name='ExamRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athena_exam_id', models.UUIDField(unique=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('problems_count', models.PositiveIntegerField()),
                ('options_per_problem', models.PositiveIntegerField(default=4)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='exams', to='Exam.examasset')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_exams', to='auth.user')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exams', to='api.school')),
            ],
            options={
                'verbose_name': 'آزمون',
                'verbose_name_plural': 'آزمون‌ها',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SessionRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athena_session_id', models.UUIDField(unique=True)),
                ('title', models.CharField(max_length=255)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('status', models.CharField(choices=[('SCHEDULED', 'زمان‌بندی‌شده'), ('RUNNING', 'در حال برگزاری'), ('COMPLETED', 'پایان‌یافته'), ('CANCELLED', 'لغو شده')], default='SCHEDULED', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_exam_sessions', to='auth.user')),
                ('exam', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='Exam.examrecord')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exam_sessions', to='api.school')),
            ],
            options={
                'verbose_name': 'جلسه آزمون',
                'verbose_name_plural': 'جلسات آزمون',
                'ordering': ['-start_time'],
            },
        ),
        migrations.CreateModel(
            name='SessionParticipantRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athena_user_id', models.UUIDField()),
                ('status', models.CharField(choices=[('ASSIGNED', 'ثبت‌شده'), ('REMOVED', 'حذف‌شده')], default='ASSIGNED', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='Exam.sessionrecord')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exam_participations', to='auth.user')),
            ],
            options={
                'verbose_name': 'شرکت‌کننده آزمون',
                'verbose_name_plural': 'شرکت‌کنندگان آزمون',
                'unique_together': {('session', 'user')},
            },
        ),
    ]
