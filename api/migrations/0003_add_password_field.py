# Generated migration for password-based authentication

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_school_userprofile_is_superadmin_userprofile_role_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='is_password_set',
            field=models.BooleanField(default=False, verbose_name='رمز عبور تنظیم شده'),
        ),
    ]
