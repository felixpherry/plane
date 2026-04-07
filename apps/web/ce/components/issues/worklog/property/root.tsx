/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { observer } from "mobx-react";
import { Clock, Play, Square, Trash2, Pencil, Plus, Timer } from "lucide-react";
import { Button, Input, CustomMenu } from "@plane/ui";
import type { IWorklog } from "@plane/types";
import { WorklogService } from "@plane/services";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { useUser } from "@/hooks/store/user";
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

export const IssueWorklogProperty = observer(function IssueWorklogProperty(props: TIssueWorklogProperty) {
  const { workspaceSlug, projectId, issueId, disabled, assigneeIds = [] } = props;
  const { data: currentUser } = useUser();
  const {
    activeTimer,
    activeIssue,
    elapsedSeconds,
    isMutating,
    error,
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

  const fetchWorklogs = useCallback(async () => {
    if (!workspaceSlug || !projectId || !issueId) return;
    try {
      setIsLoading(true);
      const data = await worklogService.listWorklogs(workspaceSlug, projectId, issueId);
      setWorklogs(data.results || []);
      setTotalDuration(data.total_duration || 0);
    } catch (error) {
      console.error("Failed to fetch worklogs:", error);
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
      console.error("Failed to start timer:", error);
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer({ description: "" });
    } catch (error) {
      console.error("Failed to stop timer:", error);
    }
  };

  const handleDiscardTimer = async () => {
    try {
      await discardTimer();
    } catch (error) {
      console.error("Failed to discard timer:", error);
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
    } catch (error) {
      console.error("Failed to create worklog:", error);
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
    } catch (error) {
      console.error("Failed to update worklog:", error);
    }
  };

  const handleDelete = async (worklogId: string) => {
    try {
      await worklogService.deleteWorklog(workspaceSlug, projectId, issueId, worklogId);
      await fetchWorklogs();
    } catch (error) {
      console.error("Failed to delete worklog:", error);
    }
  };

  const startEdit = (worklog: IWorklog) => {
    setEditingId(worklog.id);
    setEditHours(String(worklog.hours || 0));
    setEditMinutes(String(worklog.minutes || 0));
    setEditDescription(worklog.description || "");
  };

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
        <div className="mt-1 space-y-1">
          {worklogs.slice(0, 5).map((worklog) => (
            <div key={worklog.id} className="group">
              {editingId === worklog.id ? (
                <div className="rounded-md border-[0.5px] border-subtle bg-surface-2 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
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
                    <div className="flex-1">
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
                  <div className="mt-1">
                    <Input
                      mode="primary"
                      inputSize="sm"
                      className="w-full"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button variant="neutral-primary" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleEditSubmit(worklog.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="hover:bg-custom-background-80 flex items-center justify-between rounded-sm px-1.5 py-1 transition-colors">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs shrink-0 font-medium text-primary">
                      {worklog.display_duration || formatDuration(worklog.duration)}
                    </span>
                    {worklog.description && (
                      <span className="text-xs text-custom-text-300 truncate">— {worklog.description}</span>
                    )}
                    {worklog.source === "timer" && <Timer className="text-custom-text-400 h-2.5 w-2.5 shrink-0" />}
                  </div>
                  {!disabled && (
                    <CustomMenu
                      ellipsis
                      placement="bottom-end"
                      closeOnSelect
                      buttonClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CustomMenu.MenuItem onClick={() => startEdit(worklog)} className="flex items-center gap-2">
                        <Pencil className="h-3 w-3" /> Edit
                      </CustomMenu.MenuItem>
                      <CustomMenu.MenuItem
                        onClick={() => handleDelete(worklog.id)}
                        className="flex items-center gap-2 text-red-500"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </CustomMenu.MenuItem>
                    </CustomMenu>
                  )}
                </div>
              )}
            </div>
          ))}
          {worklogs.length > 5 && (
            <span className="text-xs text-custom-text-400 block px-1.5">+{worklogs.length - 5} more entries</span>
          )}
        </div>
      )}
    </>
  );
});
