import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_update_consultant_ticket_messaging'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان')),
                ('body', models.TextField(verbose_name='متن')),
                ('target_type', models.CharField(
                    choices=[
                        ('all',              'همه کاربران'),
                        ('all_students',     'همه دانش\u200cآموزان'),
                        ('school_all',       'مدارس خاص \u2013 همه'),
                        ('school_students',  'مدارس خاص \u2013 فقط دانش\u200cآموزان'),
                    ],
                    default='all',
                    max_length=20,
                    verbose_name='مخاطب',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True, verbose_name='فعال')),
                ('sender', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sent_notifications',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='فرستنده',
                )),
                ('target_schools', models.ManyToManyField(
                    blank=True,
                    related_name='notifications',
                    to='api.school',
                    verbose_name='مدارس هدف',
                )),
            ],
            options={
                'verbose_name': 'نوتیفیکیشن',
                'verbose_name_plural': 'نوتیفیکیشن\u200cها',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='NotificationRead',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(auto_now_add=True)),
                ('notification', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reads',
                    to='api.notification',
                    verbose_name='نوتیفیکیشن',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_reads',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='کاربر',
                )),
            ],
            options={
                'verbose_name': 'خواندن نوتیفیکیشن',
                'verbose_name_plural': 'خواندن\u200cهای نوتیفیکیشن',
            },
        ),
        migrations.AddConstraint(
            model_name='notificationread',
            constraint=models.UniqueConstraint(
                fields=['user', 'notification'],
                name='unique_notification_read',
            ),
        ),
    ]
