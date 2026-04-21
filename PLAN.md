# Plan

## Context

- The worklog timer currently heartbeats from the browser every 5s in `apps/web/ce/components/issues/worklog/timer/provider.tsx`.
- The API lease window is currently 15s in `apps/api/plane/app/views/issue/worklog.py` via `TIMER_LEASE_SECONDS`.
- A reported failure mode is that minimizing the browser can let the timer die after a few minutes.
- Increasing only the frontend heartbeat or only the backend lease would be unsafe; they must stay aligned so active timers do not expire unexpectedly.
- The timer also has cross-tab leader election in the provider, so heartbeat timing changes may require corresponding updates to leader timing assumptions.
- From browser behavior alone: background timer throttling is very plausible, and tab discard / page freeze can also happen. Changing the heartbeat interval by itself will not solve those cases; the server lease must be long enough to tolerate long gaps in JS execution.

## Approach

- Update the timer lease configuration on the API side and the browser heartbeat cadence on the web side together.
- Size the server lease for the failure mode we actually care about: long pauses in browser JS execution while minimized/backgrounded, not just normal network jitter.
- Keep the lease much larger than the heartbeat interval so occasional delayed heartbeats do not finalize the timer.
- Current recommendation based on user preference: hardcode the browser heartbeat to 60 seconds and the server lease to 10 minutes, which should survive common background-throttling behavior and short-lived tab freezes/discards much better than the current 5s / 15s setup.
- Accept the tradeoff that a truly abandoned timer may remain active for up to 10 minutes before the server finalizes it.
- Keep the existing 1-second cross-tab leader pings/checks unless code review reveals they are coupled to the API heartbeat; they are local coordination only and do not need to match the server lease window.
- Preserve the existing lease-token ownership model and active-timer finalization behavior.

## Files to modify

- `apps/web/ce/components/issues/worklog/timer/provider.tsx`
- `apps/api/plane/app/views/issue/worklog.py`
- `apps/api/plane/tests/contract/app/test_worklog_app.py`

## Reuse

- `create_active_timer_lease()` in `apps/api/plane/app/views/issue/worklog.py` already encapsulates lease-token creation for timer start.
- `ActiveTimer.is_lease_expired()` and `ActiveTimer.renew_lease()` in `apps/api/plane/db/models/worklog.py` already model lease-expiry/renewal behavior.
- `sendHeartbeat()` and `startHeartbeatCoordination()` in `apps/web/ce/components/issues/worklog/timer/provider.tsx` already coordinate browser heartbeats and multi-tab leadership.

## Steps

- [x] Confirm the product requirement for how long a timer should survive with no browser JS execution while minimized/backgrounded. Target: 10 minutes.
- [x] Choose the new target heartbeat interval and lease duration. Target: 60-second heartbeat and 10-minute lease.
- [x] Decide configuration strategy. Keep the new timings hardcoded for now.
- [ ] Update frontend timing constants in the global worklog timer provider.
- [ ] Update backend lease duration / renewal logic to match the new timing.
- [ ] Confirm whether any related leader-election timings need changes; keep them as-is unless they are coupled to the API heartbeat.
- [ ] Update or extend contract tests around lease expiry and heartbeat success, including asserting the returned `lease_expires_at` reflects the longer lease.

## Verification

- Run the API contract tests for worklog timer behavior.
- Verify timer-start responses and heartbeat responses now return `lease_expires_at` roughly 10 minutes ahead of the current time.
- Manually start a timer, minimize/background the tab for longer than one heartbeat interval, and confirm it remains active.
- Manually leave a minimized/backgrounded tab idle for several minutes but less than 10 minutes and confirm the timer survives.
- Manually open multiple tabs and confirm only one tab heartbeats while others can recover leadership if the leader tab closes.
- Manually simulate / wait past the new 10-minute lease window and verify an actually expired lease still finalizes the timer as expected.
