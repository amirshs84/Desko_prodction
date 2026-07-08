# Generated manually to add is_studying field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_add_password_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='is_studying',
            field=models.BooleanField(default=False, verbose_name='در حال مطالعه'),
        ),
    ]
