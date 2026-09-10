import Logger from "@/common/logger/Logger.ts";
import type {SpanTimingDTO, TimingSnapshotDTO} from "@/telemetry/dto.ts";
import {sumIntervals} from "@/telemetry/mappers.ts";

// The module's own key. Annotation drafts live under `sam2_annotation_draft:*`
// and are never touched from here.
const WORK_IN_PROGRESS_KEY = "thinannotator_timing_work_in_progress";

export const HEARTBEAT_MS = 15_000;

interface WorkInProgressState {
    lastHeartbeatWallMs: number;
    snapshot: TimingSnapshotDTO;
}

// The monotonic clock does not survive a reload, so a recovered interval can
// only be measured against wall time. Cutting it at the last heartbeat is what
// stops a crash from becoming a phantom multi-hour duration.
function truncateOpenIntervals<T extends SpanTimingDTO>(
    span: T,
    untilWallMs: number,
): T {
    const intervals = span.intervals.map((interval) =>
        interval.reason === "open"
            ? {
                  startedAt: interval.startedAt,
                  durationMs: Math.max(0, untilWallMs - interval.startedAt),
                  reason: "session-end" as const,
              }
            : interval,
    );
    return {...span, totalMs: sumIntervals(intervals), intervals};
}

export function recoverWorkInProgress(): TimingSnapshotDTO | null {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(WORK_IN_PROGRESS_KEY);
    } catch {
        return null;
    }
    if (!raw) {
        return null;
    }
    try {
        const {lastHeartbeatWallMs, snapshot} = JSON.parse(
            raw,
        ) as WorkInProgressState;
        if (
            !snapshot?.taskKey?.pairsCode ||
            typeof lastHeartbeatWallMs !== "number"
        ) {
            return null;
        }
        const sessions = snapshot.task.sessions ?? [];
        return {
            taskKey: snapshot.taskKey,
            task: {
                ...truncateOpenIntervals(snapshot.task, lastHeartbeatWallMs),
                sessions: sessions.map((session, index) =>
                    index === sessions.length - 1
                        ? {...session, truncated: true as const}
                        : session,
                ),
            },
            masks: Object.fromEntries(
                Object.entries(snapshot.masks ?? {}).map(([key, mask]) => [
                    key,
                    truncateOpenIntervals(mask, lastHeartbeatWallMs),
                ]),
            ),
        };
    } catch {
        Logger.warn("[timing] unreadable work-in-progress record, discarded");
        return null;
    }
}

export function writeWorkInProgress(snapshot: TimingSnapshotDTO | null): void {
    try {
        if (!snapshot) {
            localStorage.removeItem(WORK_IN_PROGRESS_KEY);
            return;
        }
        const state: WorkInProgressState = {
            lastHeartbeatWallMs: Date.now(),
            snapshot,
        };
        localStorage.setItem(WORK_IN_PROGRESS_KEY, JSON.stringify(state));
    } catch {
        /* quota or blocked storage — timing never fails a session */
    }
}
