/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { observer } from "mobx-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Clock, Play, Square, Trash2, Pencil, Plus, Timer } from "lucide-react";
import { Avatar, Button, CustomMenu, Input, Table } from "@plane/ui";
import { AlertModalCore } from "@plane/ui";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { PortalWrapper } from "@plane/propel/portal";
import type { IWorklog } from "@plane/types";
import { WorklogService } from "@plane/services";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import { useGlobalWorklogTimer } from "@/plane-web/components/issues/worklog/timer";

const worklogService = new WorklogService();

type TIssueWorklogProperty = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  assigneeIds?: string[];
};

type TView = "idle" | "manual-form";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateTimeFormatter.format(date);
}

function getWorklogEndTime(worklog: IWorklog): Date | null {
  const startTime = new Date(worklog.logged_at);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  return new Date(startTime.getTime() + worklog.duration * 60 * 1000);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as {
      response?: {
        data?: {
          error?: unknown;
        };
      };
    };

    if (typeof response.response?.data?.error === "string" && response.response.data.error.trim().length > 0) {
      return response.response.data.error;
    }
  }

  return fallback;
}

export const IssueWorklogProperty = observer(function IssueWorklogProperty(props: TIssueWorklogProperty) {
  const { workspaceSlug, projectId, issueId, disabled, assigneeIds = [] } = props;
  const { t } = useTranslation();
  const { data: currentUser } = useUser();
  const { allowPermissions } = useUserPermissions();
  const {
    activeTimer,
    activeIssue,
    isMutating,
    lastStoppedWorklog,
    startTimer,
    stopTimer,
    discardTimer,
    isActiveForIssue,
  } = useGlobalWorklogTimer();

  // State
  const [view, setView] = useState<TView>("idle");
  const [worklogs, setWorklogs] = useState<IWorklog[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Manual form state
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteWorklog, setDeleteWorklog] = useState<IWorklog | null>(null);
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const fetchWorklogs = useCallback(async () => {
    if (!workspaceSlug || !projectId || !issueId) return;
    try {
      setIsLoading(true);
      const data = await worklogService.listWorklogs(workspaceSlug, projectId, issueId);
      setWorklogs(data.results || []);
      setTotalDuration(data.total_duration || 0);
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Failed to fetch worklogs:"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, projectId, issueId]);

  useEffect(() => {
    void fetchWorklogs();
  }, [fetchWorklogs]);

  useEffect(() => {
    if (lastStoppedWorklog?.issue === issueId) {
      void fetchWorklogs();
    }
  }, [fetchWorklogs, issueId, lastStoppedWorklog]);

  const isTimerActiveForCurrentIssue = isActiveForIssue(issueId);
  const hasAnotherActiveTimer = !!activeTimer && !isTimerActiveForCurrentIssue;
  const canUseTimer = !disabled && !!currentUser?.id && assigneeIds.includes(currentUser.id);

  const handleStartTimer = async () => {
    try {
      await startTimer({ issueId, projectId });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Failed to start timer"),
      });
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer({ description: "" });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Failed to stop timer"),
      });
    }
  };

  const handleManualSubmit = async () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h === 0 && m === 0) return;

    setIsSubmitting(true);
    try {
      await worklogService.createWorklog(workspaceSlug, projectId, issueId, {
        hours: h,
        minutes: m,
        description,
      });
      setHours("");
      setMinutes("");
      setDescription("");
      setView("idle");
      await fetchWorklogs();
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("toast.success"),
        message: "Worklog created successfully.",
      });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Could not create worklog."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (worklogId: string) => {
    const h = parseInt(editHours) || 0;
    const m = parseInt(editMinutes) || 0;
    if (h === 0 && m === 0) return;

    try {
      await worklogService.updateWorklog(workspaceSlug, projectId, issueId, worklogId, {
        hours: h,
        minutes: m,
        description: editDescription,
      });
      setEditingId(null);
      await fetchWorklogs();
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("toast.success"),
        message: "Worklog updated successfully.",
      });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Could not update worklog."),
      });
    }
  };

  const handleDelete = async (worklogId: string) => {
    try {
      await worklogService.deleteWorklog(workspaceSlug, projectId, issueId, worklogId);
      setDeleteWorklog(null);
      await fetchWorklogs();
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("toast.success"),
        message: "Worklog deleted successfully.",
      });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: getErrorMessage(error, "Could not delete worklog."),
      });
    }
  };

  const startEdit = (worklog: IWorklog) => {
    setEditingId(worklog.id);
    setEditHours(String(worklog.hours || 0));
    setEditMinutes(String(worklog.minutes || 0));
    setEditDescription(worklog.description || "");
  };

  const requestDelete = (worklog: IWorklog) => {
    setDeleteWorklog(worklog);
  };

  const confirmDelete = async () => {
    if (!deleteWorklog) return;
    await handleDelete(deleteWorklog.id);
  };

  const worklogColumns = [
    {
      key: "started-by",
      content: "Logged",
      tdRender: (worklog: IWorklog) => (
        <div className="flex items-center gap-2">
          <Avatar
            name={worklog.user_detail.display_name}
            src={worklog.user_detail.avatar_url ?? undefined}
            size="sm"
            className="text-[10px]"
          />
          <div className="min-w-0">
            <div className="truncate text-13 font-medium text-primary">{worklog.user_detail.display_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      content: "Source",
      tdRender: (worklog: IWorklog) => (
        <div className="flex items-center gap-1.5">
          {worklog.source === "timer" && <Timer className="text-custom-text-400 h-3 w-3" />}
          <span className="capitalize">{worklog.source === "timer" ? "Timer entry" : "Manual entry"}</span>
        </div>
      ),
    },
    {
      key: "start-time",
      content: "Start time",
      tdRender: (worklog: IWorklog) => formatDateTime(worklog.logged_at),
    },
    {
      key: "end-time",
      content: "End time",
      tdRender: (worklog: IWorklog) => {
        const endTime = getWorklogEndTime(worklog);
        return endTime ? formatDateTime(endTime) : "-";
      },
    },
    {
      key: "elapsed",
      content: "Time",
      tdRender: (worklog: IWorklog) => {
        if (editingId === worklog.id) {
          return (
            <div className="flex items-center gap-2">
              <div className="w-16">
                <Input
                  type="number"
                  mode="primary"
                  inputSize="sm"
                  className="w-full"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  placeholder="0"
                  min={0}
                  autoFocus
                />
              </div>
              <span className="text-xs text-custom-text-300">h</span>
              <div className="w-16">
                <Input
                  type="number"
                  mode="primary"
                  inputSize="sm"
                  className="w-full"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  placeholder="0"
                  min={0}
                  max={59}
                />
              </div>
              <span className="text-xs text-custom-text-300">m</span>
            </div>
          );
        }

        return worklog.display_duration || formatDuration(worklog.duration);
      },
    },
    {
      key: "description",
      content: "Description",
      tdRender: (worklog: IWorklog) => {
        if (editingId === worklog.id) {
          return (
            <Input
              mode="primary"
              inputSize="sm"
              className="w-full min-w-[220px]"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
            />
          );
        }

        return <span className="block max-w-[220px] truncate">{worklog.description || "No description"}</span>;
      },
    },
  ];

  if (isAdmin) {
    worklogColumns.push({
      key: "actions",
      content: "Actions",
      tdRender: (worklog: IWorklog) => {
        // if (disabled) return null;

        if (editingId === worklog.id) {
          return (
            <div className="flex items-center justify-end gap-2">
              <Button variant="neutral-primary" size="sm" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleEditSubmit(worklog.id)}
                disabled={(parseInt(editHours) || 0) === 0 && (parseInt(editMinutes) || 0) === 0}
              >
                Save
              </Button>
            </div>
          );
        }

        return (
          <div className="flex justify-start">
            <CustomMenu ellipsis placement="bottom-end" closeOnSelect>
              <CustomMenu.MenuItem onClick={() => startEdit(worklog)} className="flex items-center gap-2">
                <Pencil className="h-3 w-3" /> Edit
              </CustomMenu.MenuItem>
              <CustomMenu.MenuItem
                onClick={() => requestDelete(worklog)}
                className="flex items-center gap-2 text-red-500"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </CustomMenu.MenuItem>
            </CustomMenu>
          </div>
        );
      },
    });
  }

  if (isLoading) return null;

  return (
    <>
      {/* Total tracked time */}
      <SidebarPropertyListItem icon={Clock} label="Time tracked">
        <div className="flex h-7.5 w-full items-center justify-between">
          <span className="text-body-xs-medium">{totalDuration > 0 ? formatDuration(totalDuration) : "None"}</span>
        </div>
      </SidebarPropertyListItem>

      {/* Action buttons */}
      {view === "idle" && !disabled && (
        <div className="flex items-center gap-2">
          {canUseTimer && !isTimerActiveForCurrentIssue && (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                prependIcon={<Play className="h-3 w-3" />}
                onClick={handleStartTimer}
                disabled={isMutating}
              >
                {hasAnotherActiveTimer ? "Switch Timer" : "Start Timer"}
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                prependIcon={<Plus className="h-3 w-3" />}
                onClick={() => setView("manual-form")}
              >
                Log manually
              </Button>
            </>
          )}

          {isTimerActiveForCurrentIssue && (
            <Button
              variant="primary"
              size="sm"
              prependIcon={<Square className="h-3 w-3" />}
              onClick={handleStopTimer}
              loading={isMutating}
            >
              Stop
            </Button>
          )}
        </div>
      )}

      {view === "idle" && hasAnotherActiveTimer && (
        <div className="mt-2 rounded-md border-[0.5px] border-subtle bg-surface-2 px-3 py-2">
          <span className="text-body-xs-medium text-secondary">
            Timer running on {activeIssue?.name ?? activeTimer.issue_identifier ?? "another issue"}.
          </span>
        </div>
      )}

      {/* Manual log form */}
      {view === "manual-form" && (
        <div className="rounded-md border-[0.5px] border-subtle bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-xs text-custom-text-300 mb-1 block">Hours</span>
              <Input
                type="number"
                mode="primary"
                inputSize="sm"
                className="w-full"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                min={0}
                autoFocus
              />
            </div>
            <div className="flex-1">
              <span className="text-xs text-custom-text-300 mb-1 block">Minutes</span>
              <Input
                type="number"
                mode="primary"
                inputSize="sm"
                className="w-full"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min={0}
                max={59}
              />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-custom-text-300 mb-1 block">Description</span>
            <Input
              mode="primary"
              inputSize="sm"
              className="w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="neutral-primary"
              size="sm"
              onClick={() => {
                setView("idle");
                setHours("");
                setMinutes("");
                setDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || ((parseInt(hours) || 0) === 0 && (parseInt(minutes) || 0) === 0)}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Worklog history */}
      {worklogs.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="text-h5-medium text-primary">Worklog History</div>
          <div className="overflow-x-auto">
            <Table
              data={worklogs}
              columns={worklogColumns}
              keyExtractor={(worklog) => worklog.id}
              tableClassName="min-w-[1040px]"
              tHeadTrClassName="divide-x-0 divide-y font-semibold text-left"
              tBodyClassName="divide-none"
              tBodyTrClassName="divide-none"
            />
          </div>
        </div>
      )}

      {deleteWorklog && (
        <PortalWrapper portalId="full-screen-portal">
          <div data-prevent-outside-click="true">
            <AlertModalCore
              isOpen={!!deleteWorklog}
              handleClose={() => setDeleteWorklog(null)}
              handleSubmit={confirmDelete}
              isSubmitting={false}
              title="Delete worklog"
              content={
                <>
                  Are you sure you want to delete the worklog for{" "}
                  <span className="font-medium break-words text-primary">{deleteWorklog.user_detail.display_name}</span>
                  ? This action cannot be undone.
                </>
              }
            />
          </div>
        </PortalWrapper>
      )}
    </>
  );
});
