# Generated manually as part of moving CalendarEvent from `api` to the new `Planning` app.
# This renames the underlying DB table in place so no data is lost; the model is still
# defined in `api`'s migration state at this point. See the following migration
# (0017) for the state-only removal, and `Planning.migrations.0001_initial` for where
# the model reappears in its new app.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_userprofile_add_consultant_role'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='calendarevent',
            table='planning_calendarevent',
        ),
    ]
