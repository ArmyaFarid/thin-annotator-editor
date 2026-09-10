// Domain vocabulary. Wire shapes live in dto.ts; mappers.ts converts.

export type CloseReason =
    | "committed"
    | "switched"
    | "deleted"
    | "abandoned"
    | "hidden"
    | "blur"
    | "task-close"
    | "session-end"
    | "idle"
    // A still-open interval, projected into a snapshot.
    | "open";

export type InteractionKind =
    | "geometry.point"
    | "geometry.bbox"
    | "geometry.polygon"
    | "geometry.freeform"
    | "geometry.slic-bbox"
    | "geometry.vertex-move"
    | "geometry.layer-delete"
    | "model.sam-result"
    | "slic.apply"
    | "refine.apply"
    | "anchors.on"
    | "anchors.off"
    | "tool.select"
    | "mode.subtract"
    | "variant.switch"
    | "undo"
    | "redo"
    | "delete.object"
    | "delete.layer"
    | "object.commit"
    | "field.edit"
    | "idle.prompted"
    | "idle.resumed"
    | "idle.forced-exit";

// Only these open an interval — the rest is looking, not working. A variant
// switch counts: comparing a grain under PPL and XPL is how a mineral is
// identified.
export const RESUMING_KINDS: ReadonlySet<InteractionKind> = new Set([
    "geometry.point",
    "geometry.bbox",
    "geometry.polygon",
    "geometry.freeform",
    "geometry.slic-bbox",
    "geometry.vertex-move",
    "geometry.layer-delete",
    "model.sam-result",
    "slic.apply",
    "refine.apply",
    "anchors.on",
    "anchors.off",
    "variant.switch",
    "undo",
    "redo",
    "delete.object",
    "delete.layer",
    "object.commit",
    "field.edit",
    // The annotator answering the prompt is itself proof they are back.
    "idle.resumed",
]);

export interface TaskKey {
    pairsCode: string;
    sampleId: string;
}

export interface Interval {
    // Wall clock at start — anchors and orders, never measures.
    startedAt: number;
    // Measured from the monotonic clock.
    durationMs: number;
    reason: CloseReason;
}

// Absolute wall time in the domain; the DTO stores it as an offset, so merging
// a stored span with a live one cannot shift it.
export interface InteractionEvent {
    wallMs: number;
    kind: InteractionKind;
    correction?: true;
}

export interface Span {
    spanId: string;
    createdAt: number;
    committedAt?: number;
    intervals: Interval[];
    counts: Partial<Record<InteractionKind, number>>;
    events: InteractionEvent[];
    openInterval: {startedAt: number; startedMonotonicMs: number} | null;
}

export interface Session {
    id: string;
    startedAt: number;
    // Ended without a clean close; intervals cut at the last heartbeat.
    truncated?: true;
}

// Injected so duration tests are deterministic.
export interface Clock {
    monotonicMs(): number;
    wallMs(): number;
}

export const systemClock: Clock = {
    monotonicMs: () => performance.now(),
    wallMs: () => Date.now(),
};
