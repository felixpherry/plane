# Worklog Serializers for Plane Community Edition
# SPDX-License-Identifier: AGPL-3.0-only

from rest_framework import serializers

from .base import BaseSerializer
from .user import UserLiteSerializer
from plane.db.models import Worklog, ActiveTimer


class WorklogSerializer(BaseSerializer):
    """
    Full serializer for worklog entries.

    Includes user details for display in activity trail.
    """

    user_detail = UserLiteSerializer(source="user", read_only=True)
    display_duration = serializers.CharField(read_only=True)
    hours = serializers.IntegerField(read_only=True)
    minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Worklog
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "workspace",
            "project",
            "deleted_at",
            "user",
            "issue",
        ]

    def validate_duration(self, value):
        """Duration must be at least 1 minute."""
        if value is not None and value < 1:
            raise serializers.ValidationError(
                "Duration must be at least 1 minute."
            )
        return value


class WorklogCreateSerializer(BaseSerializer):
    """
    Serializer for creating manual worklog entries.

    Accepts hours + minutes separately, converts to total minutes.
    """

    hours = serializers.IntegerField(
        required=False, default=0, min_value=0
    )
    minutes = serializers.IntegerField(
        required=False, default=0, min_value=0, max_value=59
    )
    description = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

    class Meta:
        model = Worklog
        fields = ["hours", "minutes", "description", "logged_at"]

    def validate(self, data):
        hours = data.get("hours", 0)
        minutes = data.get("minutes", 0)
        total = (hours * 60) + minutes

        if total < 1:
            raise serializers.ValidationError(
                "Total time must be at least 1 minute."
            )

        data["duration"] = total
        return data


class WorklogLiteSerializer(BaseSerializer):
    """
    Lightweight serializer for worklog entries.

    Used in summary/aggregate responses.
    """

    display_duration = serializers.CharField(read_only=True)

    class Meta:
        model = Worklog
        fields = [
            "id",
            "duration",
            "display_duration",
            "description",
            "source",
            "logged_at",
            "created_at",
        ]
        read_only_fields = fields


class ActiveTimerSerializer(BaseSerializer):
    """
    Serializer for the currently running timer.

    Includes elapsed time calculated from start_time.
    """

    elapsed_seconds = serializers.SerializerMethodField()
    issue_identifier = serializers.SerializerMethodField()

    class Meta:
        model = ActiveTimer
        fields = [
            "id",
            "issue",
            "project",
            "workspace",
            "user",
            "start_time",
            "lease_expires_at",
            "last_heartbeat_at",
            "elapsed_seconds",
            "issue_identifier",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "workspace",
            "deleted_at",
            "user",
        ]

    def get_elapsed_seconds(self, obj):
        """Calculate elapsed seconds since timer started."""
        from django.utils import timezone

        if obj.start_time:
            delta = timezone.now() - obj.start_time
            return int(delta.total_seconds())
        return 0

    def get_issue_identifier(self, obj):
        """Get the issue identifier (e.g., PROJ-123) for display."""
        if obj.issue and obj.issue.project:
            return f"{obj.issue.project.identifier}-{obj.issue.sequence_id}"
        return None


class TimerHeartbeatSerializer(serializers.Serializer):
    """
    Serializer for renewing an active timer lease.
    """

    lease_token = serializers.CharField(required=True, allow_blank=False)


class TimerStartSerializer(serializers.Serializer):
    """
    Serializer for starting a timer.

    Only requires issue_id and project_id.
    """

    issue_id = serializers.UUIDField(required=True)
    project_id = serializers.UUIDField(required=True)
