from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_add_school_class'),
    ]

    operations = [
        migrations.AddField(
            model_name='school',
            name='phone',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='تلفن'),
        ),
        migrations.AddField(
            model_name='school',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254, verbose_name='ایمیل'),
        ),
        migrations.AddField(
            model_name='school',
            name='address',
            field=models.TextField(blank=True, default='', verbose_name='آدرس'),
        ),
    ]
