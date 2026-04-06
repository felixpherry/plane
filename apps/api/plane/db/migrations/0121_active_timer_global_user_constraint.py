# Generated manually to make active timers global per user.

from django.db import migrations, models
from django.db.models import Q
from django.utils import timezone


def cleanup_legacy_active_timers(apps, schema_editor):
    ActiveTimer = apps.get_model("db", "ActiveTimer")
    now = timezone.now()

    current_user_id = None
    legacy_timer_ids = []

    for timer in (
        ActiveTimer.objects.filter(deleted_at__isnull=True)
        .order_by("user_id", "-start_time", "-created_at", "-id")
        .only("id", "user_id")
    ):
        if timer.user_id != current_user_id:
            current_user_id = timer.user_id
            continue

        legacy_timer_ids.append(timer.id)

    if legacy_timer_ids:
        ActiveTimer.objects.filter(id__in=legacy_timer_ids).update(deleted_at=now)


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
