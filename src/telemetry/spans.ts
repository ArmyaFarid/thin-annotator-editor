import {uuidv4} from "@/common/utils/uuid.ts";
import type {
    DiscardedSpanDTO,
    MaskTimingDTO,
    TimingSnapshotDTO,
} from "@/telemetry/dto.ts";
import {dtoToSpan, spanToDto} from "@/telemetry/mappers.ts";
import {
    RESUMING_KINDS,
    systemClock,
    type Clock,
    type CloseReason,
    type InteractionKind,
    type Session,
    type Span,
    type TaskKey,
} from "@/telemetry/types.ts";

type Counts = Partial<Record<InteractionKind, number>>;

function taskIdOf(key: TaskKey): string {
    return `${key.pairsCode}/${key.sampleId}`;
}

function addCounts(base: Counts, extra: Counts): Counts {
    const merged = {...base};
    for (const [rawKind, count] of Object.entries(extra)) {
        const kind = rawKind as InteractionKind;
        merged[kind] = (merged[kind] ?? 0) + (count ?? 0);
    }
    return merged;
}

function mergeSpan(stored: Span, live: Span): Span {
    return {
        spanId: stored.spanId,
        createdAt: Math.min(stored.createdAt, live.createdAt),
        committedAt: stored.committedAt ?? live.committedAt,
        intervals: [...stored.intervals, ...live.intervals],
        counts: addCounts(stored.counts, live.counts),
        events: [...stored.events, ...live.events].sort(
            (a, b) => a.wallMs - b.wallMs,
        ),
        openInterval: live.openInterval,
    };
}

export class SpanRegistry {
    private readonly clock: Clock;
    private readonly session: Session;

    private taskSpan: Span | null = null;
    private taskKey: TaskKey | null = null;
    private viewedAt = 0;
    private sessions: Session[] = [];
    private discarded: DiscardedSpanDTO[] = [];

    private objectSpans = new Map<number, Span>();
    private activeObject: {key: number | null; span: Span} | null = null;
    private selectedKey: number | null = null;
    private correctionArmed = false;

    // Timing absorbed before its task opened — a batch response arrives while
    // the previous task is still the active one.
    private pendingSeeds = new Map<string, TimingSnapshotDTO>();

    constructor(clock: Clock = systemClock, sessionId: string = uuidv4()) {
        this.clock = clock;
        this.session = {id: sessionId, startedAt: clock.wallMs()};
    }

    private newSpan(): Span {
        return {
            spanId: uuidv4(),
            createdAt: this.clock.wallMs(),
            intervals: [],
            counts: {},
            events: [],
            openInterval: null,
        };
    }

    private openInterval(span: Span): void {
        if (!span.openInterval) {
            span.openInterval = {
                startedAt: this.clock.wallMs(),
                startedMonotonicMs: this.clock.monotonicMs(),
            };
        }
    }

    private closeInterval(
        span: Span,
        reason: CloseReason,
        atMonotonicMs?: number,
    ): void {
        if (!span.openInterval) {
            return;
        }
        const durationMs = Math.round(
            (atMonotonicMs ?? this.clock.monotonicMs()) -
                span.openInterval.startedMonotonicMs,
        );
        if (durationMs > 0) {
            span.intervals.push({
                startedAt: span.openInterval.startedAt,
                durationMs,
                reason,
            });
        }
        span.openInterval = null;
    }

    private recordEvent(
        span: Span,
        kind: InteractionKind,
        correction: boolean,
    ): void {
        span.counts[kind] = (span.counts[kind] ?? 0) + 1;
        span.events.push({
            wallMs: this.clock.wallMs(),
            kind,
            ...(correction ? {correction: true as const} : {}),
        });
    }

    private objectSpanFor(key: number): Span {
        const existing = this.objectSpans.get(key);
        if (existing) {
            return existing;
        }
        const span = this.newSpan();
        this.objectSpans.set(key, span);
        return span;
    }

    // ── task ────────────────────────────────────────────────────────────

    openTask(key: TaskKey): void {
        const taskId = taskIdOf(key);
        if (this.taskKey && taskIdOf(this.taskKey) === taskId) {
            return;
        }
        this.endTask("task-close");
        this.taskKey = key;
        this.taskSpan = this.newSpan();
        this.viewedAt = this.clock.wallMs();
        this.sessions = [this.session];
        const seed = this.pendingSeeds.get(taskId);
        if (seed) {
            this.pendingSeeds.delete(taskId);
            this.applySeed(seed);
        }
    }

    endTask(reason: CloseReason): void {
        if (!this.taskSpan) {
            return;
        }
        this.closeObject(reason);
        this.closeInterval(this.taskSpan, reason);
        this.taskSpan = null;
        this.taskKey = null;
        this.objectSpans.clear();
        this.discarded = [];
        this.selectedKey = null;
        this.activeObject = null;
    }

    // ── objects ─────────────────────────────────────────────────────────

    /** Selection alone costs nothing; the interval opens on the first action. */
    selectObject(key: number): void {
        if (this.activeObject?.key === key) {
            return;
        }
        this.closeObject("switched");
        this.selectedKey = key;
    }

    /** A new object exists before its mask id does — SAM assigns that later. */
    beginProvisionalObject(): void {
        if (this.activeObject) {
            return;
        }
        this.selectedKey = null;
        this.activeObject = {key: null, span: this.newSpan()};
    }

    bindProvisionalObject(key: number): void {
        if (
            !this.activeObject ||
            this.activeObject.key !== null ||
            this.objectSpans.has(key)
        ) {
            return;
        }
        this.activeObject.key = key;
        this.objectSpans.set(key, this.activeObject.span);
    }

    commitObject(key: number): void {
        if (this.activeObject?.key !== key) {
            return;
        }
        this.recordInteraction("object.commit");
        this.activeObject.span.committedAt ??= this.clock.wallMs();
        this.closeObject("committed");
    }

    deleteObject(key: number): void {
        this.recordInteraction("delete.object");
        const span =
            this.activeObject?.key === key
                ? this.activeObject.span
                : this.objectSpans.get(key);
        if (!span) {
            return;
        }
        this.closeInterval(span, "deleted");
        this.discarded.push({...spanToDto(span, this.clock), objectKey: key});
        this.objectSpans.delete(key);
        if (this.activeObject?.key === key) {
            this.activeObject = null;
        }
    }

    closeObject(reason: CloseReason): void {
        this.selectedKey = null;
        if (!this.activeObject) {
            return;
        }
        this.closeInterval(this.activeObject.span, reason);
        if (this.activeObject.key === null) {
            this.discarded.push({
                ...spanToDto(this.activeObject.span, this.clock),
                objectKey: null,
            });
        }
        this.activeObject = null;
    }

    /** A provisional span that never became an object. */
    abandonProvisionalObject(): void {
        if (this.activeObject?.key === null) {
            this.closeObject("abandoned");
        }
    }

    // ── interactions ────────────────────────────────────────────────────

    recordInteraction(kind: InteractionKind): void {
        if (!this.taskSpan) {
            return;
        }
        const resuming = RESUMING_KINDS.has(kind);
        const correction =
            this.correctionArmed && kind !== "undo" && kind !== "redo";
        this.correctionArmed = kind === "undo";

        if (resuming) {
            this.openInterval(this.taskSpan);
            if (!this.activeObject && this.selectedKey !== null) {
                this.activeObject = {
                    key: this.selectedKey,
                    span: this.objectSpanFor(this.selectedKey),
                };
                this.selectedKey = null;
            }
            if (this.activeObject) {
                this.openInterval(this.activeObject.span);
            }
        }

        this.recordEvent(this.taskSpan, kind, correction);
        if (this.activeObject) {
            this.recordEvent(this.activeObject.span, kind, correction);
        }
    }

    /**
     * Focus loss, page hide and going idle are interval boundaries, not pauses.
     * `atMonotonicMs` backdates the close — an idle stretch ends at the last
     * input, not when the timer noticed, or every gap gains the threshold.
     */
    suspend(reason: CloseReason, atMonotonicMs?: number): void {
        if (!this.taskSpan) {
            return;
        }
        if (this.activeObject) {
            this.closeInterval(this.activeObject.span, reason, atMonotonicMs);
        }
        this.closeInterval(this.taskSpan, reason, atMonotonicMs);
    }

    /** True while a grain is being worked on — it earns a longer idle rope. */
    hasObjectInProgress(): boolean {
        return this.activeObject !== null;
    }

    isTaskOpen(): boolean {
        return this.taskSpan !== null;
    }

    // ── snapshot / seed ─────────────────────────────────────────────────

    snapshot(): TimingSnapshotDTO | null {
        if (!this.taskSpan || !this.taskKey) {
            return null;
        }
        const masks: Record<number, MaskTimingDTO> = {};
        for (const [key, span] of this.objectSpans) {
            masks[key] = spanToDto(span, this.clock);
        }
        const task = spanToDto(this.taskSpan, this.clock);
        const objectsTotalMs = [
            ...Object.values(masks),
            ...this.discarded,
        ].reduce((total, span) => total + span.totalMs, 0);
        return {
            taskKey: this.taskKey,
            task: {
                ...task,
                taskKey: this.taskKey,
                viewedAt: this.viewedAt,
                objectsTotalMs,
                overheadMs: Math.max(0, task.totalMs - objectsTotalMs),
                discarded: this.discarded,
                sessions: this.sessions,
            },
            masks,
        };
    }

    absorb(snapshot: TimingSnapshotDTO): void {
        const taskId = taskIdOf(snapshot.taskKey);
        if (!this.taskKey || taskIdOf(this.taskKey) !== taskId) {
            this.pendingSeeds.set(taskId, snapshot);
            return;
        }
        this.applySeed(snapshot);
    }

    private applySeed(seed: TimingSnapshotDTO): void {
        if (!this.taskSpan) {
            return;
        }
        this.taskSpan = mergeSpan(dtoToSpan(seed.task), this.taskSpan);
        this.viewedAt = seed.task.viewedAt || this.viewedAt;
        this.discarded = [...(seed.task.discarded ?? []), ...this.discarded];
        const storedSessions = seed.task.sessions ?? [];
        const known = new Set(storedSessions.map((session) => session.id));
        this.sessions = [
            ...storedSessions,
            ...this.sessions.filter((session) => !known.has(session.id)),
        ];
        for (const [rawKey, dto] of Object.entries(seed.masks ?? {})) {
            const key = Number(rawKey);
            const live = this.objectSpans.get(key);
            const merged = live
                ? mergeSpan(dtoToSpan(dto), live)
                : dtoToSpan(dto);
            this.objectSpans.set(key, merged);
            if (this.activeObject?.key === key) {
                this.activeObject.span = merged;
            }
        }
    }
}
