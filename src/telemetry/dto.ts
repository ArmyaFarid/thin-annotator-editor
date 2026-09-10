// On-disk shapes, written into the task file. Declared separately from the
// domain in types.ts: `version` versions this taxonomy independently of
// TASK_FORMAT_VERSION, and a stored document must keep parsing.

import type {CloseReason, InteractionKind, TaskKey} from "@/telemetry/types.ts";

export const TIMING_SCHEMA_VERSION = 1;

export interface IntervalDTO {
    startedAt: number;
    durationMs: number;
    reason: CloseReason;
}

export interface InteractionEventDTO {
    // Offset from the span's createdAt.
    offsetMs: number;
    kind: InteractionKind;
    correction?: true;
}

export interface SpanTimingDTO {
    version: number;
    spanId: string;
    createdAt: number;
    committedAt?: number;
    // Sum of `intervals`. Derived, and rewritten on every save — stored so the
    // file answers "how long did this grain take" without post-processing.
    totalMs: number;
    intervals: IntervalDTO[];
    counts: Partial<Record<InteractionKind, number>>;
    events: InteractionEventDTO[];
}

export type MaskTimingDTO = SpanTimingDTO;

export interface DiscardedSpanDTO extends SpanTimingDTO {
    objectKey: number | null;
}

export interface SessionDTO {
    id: string;
    startedAt: number;
    truncated?: true;
}

export interface TaskTimingDTO extends SpanTimingDTO {
    taskKey: TaskKey;
    viewedAt: number;
    // Attributed to individual grains, kept and discarded alike.
    objectsTotalMs: number;
    // totalMs − objectsTotalMs: task work that belongs to no single grain.
    overheadMs: number;
    discarded: DiscardedSpanDTO[];
    sessions: SessionDTO[];
}

/** One task's complete timing — what a save writes and a load reads back. */
export interface TimingSnapshotDTO {
    taskKey: TaskKey;
    task: TaskTimingDTO;
    masks: Record<number, MaskTimingDTO>;
}
