# Generated manually to add the 'consultant' role choice.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_school_contact_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('student', 'دانش‌آموز'),
                    ('manager', 'مدیر'),
                    ('consultant', 'مشاور'),
                ],
                default='student',
                max_length=10,
            ),
        ),
    ]
