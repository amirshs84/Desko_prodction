# Generated manually as part of moving CalendarEvent from `api` to the new `Planning` app.
# The DB table itself was already renamed in 0016 and is left untouched here — this only
# removes the model from `api`'s migration state. `Planning.migrations.0001_initial`
# re-creates the state for it (pointing at the same, already-renamed table).

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_rename_calendarevent_table_for_planning'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='CalendarEvent'),
            ],
            database_operations=[],
        ),
    ]
