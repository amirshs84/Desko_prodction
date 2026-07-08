from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_calendar_event_group_id'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='subject',
            constraint=models.UniqueConstraint(
                fields=('user', 'name'),
                name='unique_subject_per_user',
            ),
        ),
    ]
