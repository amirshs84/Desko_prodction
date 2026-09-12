from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_userprofile_athena_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='phone_number',
            field=models.CharField(
                help_text='نام کاربری ورود: حروف انگلیسی، عدد یا علامت خاص',
                max_length=150,
                unique=True,
                verbose_name='نام کاربری',
            ),
        ),
    ]