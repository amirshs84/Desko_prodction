from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_remove_calendarevent_from_api'),
    ]

    operations = [
        migrations.AddField(
            model_name='studysession',
            name='mode',
            field=models.CharField(
                choices=[
                    ('study', 'مطالعه'),
                    ('test', 'تست‌زنی'),
                    ('solve', 'حل سوال'),
                    ('review', 'مرور'),
                    ('homework', 'تکلیف'),
                ],
                default='study',
                max_length=16,
                verbose_name='نوع فعالیت',
            ),
        ),
        migrations.AddField(
            model_name='studysession',
            name='count_test',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                verbose_name='تعداد تست',
            ),
        ),
    ]
