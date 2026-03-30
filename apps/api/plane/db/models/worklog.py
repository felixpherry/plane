# Time Tracking for Plane Community Edition
# Adds worklog (manual time logging) and timer (start/stop) support.
# SPDX-License-Identifier: AGPL-3.0-only

from django.db import models
from django.db.models import Q
from django.utils import timezone

from .workspace import WorkspaceBaseModel


class WorklogSource(models.TextChoices):
    MANUAL = "manual", "Manual"
    TIMER = "timer", "Timer"


class Worklog(WorkspaceBaseModel):
    """Stores time logged against an issue.

    Entries can come from manual input (hours + minutes form)
    or from the timer (start/stop). The source field tracks
    which method was used.

    Duration is stored in minutes:
    - 90 = 1h 30m
    - 210 = 3h 30m
    """

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="worklogs",
    )
    user = models.ForeignKey(
        "db.User",
        on_delete=models.CASCADE,
        related_name="worklogs",
    )
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.CASCADE,
        related_name="worklogs",
    )
    duration = models.IntegerField(
        help_text="Duration in minutes. e.g. 90 = 1h 30m",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional description of work done.",
    )
    logged_at = models.DateTimeField(
        default=timezone.now,
        help_text="When this work was done. Defaults to now.",
    )
    source = models.CharField(
        max_length=20,
        choices=WorklogSource.choices,
        default=WorklogSource.MANUAL,
        help_text="How this entry was created: manual input or timer stop.",
    )

    class Meta:
        verbose_name = "Worklog"
        verbose_name_plural = "Worklogs"
        db_table = "worklogs"
        ordering = ("-logged_at",)

    @property
    def hours(self):
        return self.duration // 60

    @property
    def minutes(self):
        return self.duration % 60

    @property
    def display_duration(self):
        h = self.duration // 60
        m = self.duration % 60
        if h and m:
            return f"{h}h {m}m"
        elif h:
            return f"{h}h"
        else:
            return f"{m}m"

    def __str__(self):
        return f"{self.user} logged {self.display_duration} on {self.issue}"


class ActiveTimer(WorkspaceBaseModel):
    """Tracks the currently running timer for a user.

    Each user can have at most one active timer per workspace.
    When a user starts a timer on a new issue, any existing
    active timer is automatically stopped and saved as a worklog.

    When the timer is stopped:
    1. Calculate duration = now - start_time (in minutes)
    2. Create a Worklog entry with source='timer'
    3. Delete this ActiveTimer row
    """

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="active_timers",
    )
    user = models.ForeignKey(
        "db.User",
        on_delete=models.CASCADE,
        related_name="active_timer",
    )
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.CASCADE,
        related_name="active_timers",
    )
    start_time = models.DateTimeField(
        default=timezone.now,
        help_text="When the timer was started.",
    )

    class Meta:
        verbose_name = "Active Timer"
        verbose_name_plural = "Active Timers"
        db_table = "active_timers"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "workspace"],
                condition=Q(deleted_at__isnull=True),
                name="active_timer_unique_user_workspace_when_not_deleted",
            )
        ]

    @property
    def elapsed_seconds(self):
        """Seconds elapsed since timer started."""
        return int((timezone.now() - self.start_time).total_seconds())

    @property
    def elapsed_minutes(self):
        """Minutes elapsed since timer started (rounded down)."""
        return self.elapsed_seconds // 60

    def stop(self):
        """Stop the timer and create a worklog entry.

        Returns the created Worklog instance.
        """
        duration_minutes = max(1, self.elapsed_minutes)  # minimum 1 minute

        worklog = Worklog.objects.create(
            workspace=self.workspace,
            project=self.project,
            issue=self.issue,
            user=self.user,
            duration=duration_minutes,
            logged_at=self.start_time,
            source=WorklogSource.TIMER,
            created_by=self.created_by,
        )

        self.delete()
        return worklog

    def __str__(self):
        return f"{self.user} timer on {self.issue} (started {self.start_time})"
