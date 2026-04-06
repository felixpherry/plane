# Generated manually to make active timers global per user.

from django.db import migrations, models
from django.db.models import Q


def cleanup_legacy_active_timers(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            WITH ranked AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY user_id
                        ORDER BY start_time DESC, created_at DESC, id DESC
                    ) AS rn
                FROM active_timers
                WHERE deleted_at IS NULL
            )
            UPDATE active_timers
            SET deleted_at = NOW()
            WHERE id IN (
                SELECT id
                FROM ranked
                WHERE rn > 1
            )
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0120_issueview_archived_at"),
    ]

    operations = [
        migrations.RunPython(cleanup_legacy_active_timers, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="activetimer",
            name="active_timer_unique_user_workspace_when_not_deleted",
        ),
        migrations.AddConstraint(
            model_name="activetimer",
            constraint=models.UniqueConstraint(
                fields=("user",),
                condition=Q(deleted_at__isnull=True),
                name="active_timer_unique_user_when_not_deleted",
            ),
        ),
    ]
