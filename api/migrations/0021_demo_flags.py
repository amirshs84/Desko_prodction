from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_userprofile_username_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='school',
            name='is_demo',
            field=models.BooleanField(
                default=False,
                help_text='روی این مدرسه بسته دموی فروش ساخته شده است',
                verbose_name='بسته دمو',
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='is_demo',
            field=models.BooleanField(default=False, verbose_name='اکانت دمو'),
        ),
        migrations.AddField(
            model_name='schoolclass',
            name='is_demo',
            field=models.BooleanField(default=False, verbose_name='کلاس دمو'),
        ),
    ]
