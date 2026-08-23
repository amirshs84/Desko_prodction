from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_studysession_mode_count_test'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='athena_id',
            field=models.UUIDField(
                blank=True,
                null=True,
                unique=True,
                verbose_name='شناسه موتور آزمون',
            ),
        ),
    ]
