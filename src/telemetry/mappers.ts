import Logger from "@/common/logger/Logger.ts";
import type {MaskDTO} from "@/lib/services/api/task/dto.ts";
import {
    TIMING_SCHEMA_VERSION,
    type InteractionEventDTO,
    type IntervalDTO,
    type MaskTimingDTO,
    type SpanTimingDTO,
    type TaskTimingDTO,
    type TimingSnapshotDTO,
} from "@/telemetry/dto.ts";
import type {
    Clock,
    CloseReason,
    InteractionKind,
    Span,
    TaskKey,
} from "@/telemetry/types.ts";

// Validation mirrors task/mappers.ts: a malformed record is dropped with a
// warning rather than poisoning the registry with NaN durations.

function isInterval(raw: unknown): raw is IntervalDTO {
    const interval = raw as IntervalDTO;
    return (
        typeof interval?.startedAt === "number" &&
        typeof interval.durationMs === "number" &&
        Number.isFinite(interval.durationMs) &&
        typeof interval.reason === "string"
    );
}

function isEvent(raw: unknown): raw is InteractionEventDTO {
    const event = raw as InteractionEventDTO;
    return (
        typeof event?.offsetMs === "number" &&
        Number.isFinite(event.offsetMs) &&
        typeof event.kind === "string"
    );
}

export function sumIntervals(intervals: IntervalDTO[]): number {
    return intervals.reduce(
        (total, interval) => total + interval.durationMs,
        0,
    );
}

export function spanToDto(span: Span, clock: Clock): SpanTimingDTO {
    const intervals = [...span.intervals];
    if (span.openInterval) {
        intervals.push({
            startedAt: span.openInterval.startedAt,
            durationMs: Math.max(
                0,
                Math.round(
                    clock.monotonicMs() - span.openInterval.startedMonotonicMs,
                ),
            ),
            reason: "open",
        });
    }
    return {
        version: TIMING_SCHEMA_VERSION,
        spanId: span.spanId,
        createdAt: span.createdAt,
        ...(span.committedAt === undefined
            ? {}
            : {committedAt: span.committedAt}),
        totalMs: sumIntervals(intervals),
        intervals,
        counts: {...span.counts},
        events: span.events.map((event) => ({
            offsetMs: event.wallMs - span.createdAt,
            kind: event.kind,
            ...(event.correction ? {correction: true as const} : {}),
        })),
    };
}

// An "open" interval belongs to a session that has since ended, so its measured
// duration is already final.
export function dtoToSpan(dto: SpanTimingDTO): Span {
    return {
        spanId: dto.spanId,
        createdAt: dto.createdAt,
        committedAt: dto.committedAt,
        intervals: dto.intervals.map((interval) =>
            interval.reason === "open"
                ? {...interval, reason: "session-end" as CloseReason}
                : interval,
        ),
        counts: {...dto.counts},
        events: dto.events.map((event) => ({
            wallMs: dto.createdAt + event.offsetMs,
            kind: event.kind,
            correction: event.correction,
        })),
        openInterval: null,
    };
}

function parseSpanDto(raw: unknown): SpanTimingDTO | null {
    const span = raw as SpanTimingDTO;
    if (typeof span?.spanId !== "string" || !Array.isArray(span.intervals)) {
        return null;
    }
    const kept = span.intervals.filter(isInterval);
    return {
        version: typeof span.version === "number" ? span.version : 1,
        spanId: span.spanId,
        createdAt: typeof span.createdAt === "number" ? span.createdAt : 0,
        ...(typeof span.committedAt === "number"
            ? {committedAt: span.committedAt}
            : {}),
        // Recomputed rather than trusted: intervals may have been filtered.
        totalMs: sumIntervals(kept),
        intervals: kept,
        counts: (span.counts ?? {}) as Partial<Record<InteractionKind, number>>,
        events: Array.isArray(span.events) ? span.events.filter(isEvent) : [],
    };
}

/** Reads timing back off a loaded task payload. Returns null when it holds none. */
export function responseToSnapshot(
    taskKey: TaskKey,
    annotations: unknown,
    taskTiming: unknown,
): TimingSnapshotDTO | null {
    const task = parseSpanDto(taskTiming);
    const stored = taskTiming as TaskTimingDTO | undefined;
    const masks: Record<number, MaskTimingDTO> = {};
    let dropped = 0;

    if (Array.isArray(annotations)) {
        for (const entry of annotations as MaskDTO[]) {
            if (entry?.timing === undefined) {
                continue;
            }
            const span = parseSpanDto(entry.timing);
            if (span && typeof entry.id === "number") {
                masks[entry.id] = span;
            } else {
                dropped++;
            }
        }
    }
    if (dropped > 0) {
        Logger.warn(
            `[timing] dropped ${dropped} malformed mask timing record(s)`,
        );
    }
    if (!task && Object.keys(masks).length === 0) {
        return null;
    }
    return {
        taskKey,
        task: {
            ...(task ?? {
                version: TIMING_SCHEMA_VERSION,
                spanId: "",
                createdAt: 0,
                totalMs: 0,
                intervals: [],
                counts: {},
                events: [],
            }),
            taskKey,
            viewedAt:
                typeof stored?.viewedAt === "number" ? stored.viewedAt : 0,
            // Rollups are always recomputed from the live registry on save.
            objectsTotalMs: 0,
            overheadMs: 0,
            discarded: Array.isArray(stored?.discarded) ? stored.discarded : [],
            sessions: Array.isArray(stored?.sessions) ? stored.sessions : [],
        },
        masks,
    };
}

/** Folds a snapshot into outgoing mask DTOs, leaving untimed masks untouched. */
export function snapshotToMaskDtos(
    masks: MaskDTO[],
    snapshot: TimingSnapshotDTO,
): MaskDTO[] {
    return masks.map((mask) => {
        const timing = snapshot.masks[mask.id];
        return timing ? {...mask, timing} : mask;
    });
}
