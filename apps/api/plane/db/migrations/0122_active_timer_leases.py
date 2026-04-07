from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0121_active_timer_global_user_constraint"),
    ]

    operations = [
        migrations.AddField(
            model_name="activetimer",
            name="lease_token",
            field=models.CharField(blank=True, default="", help_text="Opaque token used by the owning client to renew the timer lease.", max_length=64),
        ),
        migrations.AddField(
            model_name="activetimer",
            name="lease_expires_at",
            field=models.DateTimeField(blank=True, help_text="When the current timer lease expires.", null=True),
        ),
        migrations.AddField(
            model_name="activetimer",
            name="last_heartbeat_at",
            field=models.DateTimeField(blank=True, help_text="When the owning client last renewed the lease.", null=True),
        ),
    ]
