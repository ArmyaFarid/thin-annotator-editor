import {getDefaultStore} from "jotai";
import {
    activeImage,
    activePairAtom,
    activeToolAtom,
    currentMaskAtom,
    filterGammaCombinationAtom,
    masksAtom,
    subtractModeAtom,
    type Mask,
} from "@/app/atom.ts";
import {
    historyAtom,
    type HistoryEntry,
    type HistoryLabel,
} from "@/app/history.ts";
import {idlePromptAtom} from "@/telemetry/atoms.ts";
import type {SpanRegistry} from "@/telemetry/spans.ts";
import {HEARTBEAT_MS, writeWorkInProgress} from "@/telemetry/store.ts";
import type {InteractionKind} from "@/telemetry/types.ts";

const FIELD_EDIT_DEBOUNCE_MS = 400;

// Silence long enough to doubt the annotator is at the desk. A grain already
// under way earns more rope: starting one is evidence of intent to finish it.
// const IDLE_MS = 4 * 60_000;
const IDLE_MS = 20_000;
const IDLE_WITH_OBJECT_MS = 8 * 60_000;
const IDLE_GRACE_MS = 2 * 60_000;

// pointermove fires per frame; the timestamp does not need that resolution.
const PRESENCE_THROTTLE_MS = 250;

// `mask.delete` is absent on purpose: the masks diff sees deletions from both
// the keyboard and the panel, and the panel path commits no history entry.
const HISTORY_KINDS: Record<HistoryLabel["action"], InteractionKind | null> = {
    "keypoint.add": "geometry.point",
    "bbox.add": "geometry.bbox",
    "slic-bbox.set": "geometry.slic-bbox",
    "polygon.add": "geometry.polygon",
    "freeform.add": "geometry.freeform",
    "layer.delete": "geometry.layer-delete",
    "vertex.move": "geometry.vertex-move",
    "mask.delete": null,
    "mask.rename": "field.edit",
    "mask.merge": "anchors.off",
    "mask.extract-contours": "anchors.on",
    "sam.result": "model.sam-result",
    "slic.result": "slic.apply",
    other: null,
};

const OPENS_AN_OBJECT: ReadonlySet<InteractionKind> = new Set([
    "geometry.point",
    "geometry.bbox",
    "geometry.polygon",
    "geometry.freeform",
    "geometry.slic-bbox",
]);

function kindOf(label: HistoryLabel): InteractionKind | null {
    if (label.action === "other") {
        return label.payload.note === "refine apply" ? "refine.apply" : null;
    }
    return HISTORY_KINDS[label.action];
}

export function attachSubscriptions(registry: SpanRegistry): () => void {
    const store = getDefaultStore();
    const teardown: (() => void)[] = [];

    const flush = () => writeWorkInProgress(registry.snapshot());

    const record = (kind: InteractionKind) => registry.recordInteraction(kind);

    // A reset empties masks and currentMask while the pair is unchanged, and it
    // clears the image first — so a null image means "not a user edit".
    const editing = () => store.get(activeImage) !== null;

    // ── task ────────────────────────────────────────────────────────────

    let lastPairKey: string | null = null;
    teardown.push(
        store.sub(activePairAtom, () => {
            const pair = store.get(activePairAtom);
            const key = pair ? `${pair.pairsCode}/${pair.sampleId}` : null;
            if (key === lastPairKey) {
                return;
            }
            lastPairKey = key;
            store.set(idlePromptAtom, null);
            if (pair) {
                registry.openTask(pair);
            } else {
                registry.endTask("task-close");
            }
            flush();
        }),
    );

    // Leaving the editor (home, task switch, reset) closes the open intervals
    // without ending the task, so returning to it resumes rather than restarts.
    teardown.push(
        store.sub(activeImage, () => {
            if (store.get(activeImage) === null) {
                registry.suspend("task-close");
                store.set(idlePromptAtom, null);
                flush();
            }
        }),
    );

    // ── objects ─────────────────────────────────────────────────────────

    let lastCurrentMask = store.get(currentMaskAtom);
    teardown.push(
        store.sub(currentMaskAtom, () => {
            const current = store.get(currentMaskAtom);
            const previous = lastCurrentMask;
            lastCurrentMask = current;
            if (current === previous || !editing()) {
                return;
            }
            if (current !== 0) {
                registry.selectObject(current);
                return;
            }
            // A delete already closed the span; a surviving mask means a commit.
            if (
                previous !== 0 &&
                store.get(masksAtom).some((mask) => mask.id === previous)
            ) {
                registry.commitObject(previous);
            }
        }),
    );

    let lastMasks: Mask[] = store.get(masksAtom);
    let fieldEditTimer: ReturnType<typeof setTimeout> | null = null;
    teardown.push(
        store.sub(masksAtom, () => {
            const masks = store.get(masksAtom);
            const previous = lastMasks;
            lastMasks = masks;
            if (!editing()) {
                return;
            }
            const ids = new Set(masks.map((mask) => mask.id));
            for (const mask of masks) {
                if (!previous.some((old) => old.id === mask.id)) {
                    registry.bindProvisionalObject(mask.id);
                }
            }
            for (const old of previous) {
                if (!ids.has(old.id)) {
                    registry.deleteObject(old.id);
                }
            }
            const edited = masks.some((mask) => {
                const old = previous.find(
                    (candidate) => candidate.id === mask.id,
                );
                return (
                    old !== undefined &&
                    (old.label !== mask.label ||
                        old.annotation !== mask.annotation)
                );
            });
            if (edited && !fieldEditTimer) {
                fieldEditTimer = setTimeout(() => {
                    fieldEditTimer = null;
                    record("field.edit");
                }, FIELD_EDIT_DEBOUNCE_MS);
            }
        }),
    );

    // ── interactions from the undo history ──────────────────────────────

    const initialHistory = store.get(historyAtom);
    let lastTop: HistoryEntry | undefined = initialHistory.past.at(-1);
    let lastFutureLength = initialHistory.future.length;
    let lastFutureTopLabel: HistoryLabel | undefined =
        initialHistory.future.at(-1)?.label;

    teardown.push(
        store.sub(historyAtom, () => {
            const {past, future} = store.get(historyAtom);
            const top = past.at(-1);
            const rebase = () => {
                lastTop = top;
                lastFutureLength = future.length;
                lastFutureTopLabel = future.at(-1)?.label;
            };

            if (past.length === 0 && future.length === 0) {
                rebase();
                return;
            }
            if (future.length > lastFutureLength) {
                record("undo");
                rebase();
                return;
            }
            // Redo restores the label object itself, so identity separates it
            // from a fresh action that merely cleared the redo stack.
            if (top !== undefined && top.label === lastFutureTopLabel) {
                record("redo");
                rebase();
                return;
            }
            if (top !== lastTop && top !== undefined) {
                const kind = kindOf(top.label);
                if (kind) {
                    if (
                        OPENS_AN_OBJECT.has(kind) &&
                        store.get(currentMaskAtom) === 0
                    ) {
                        registry.beginProvisionalObject();
                    }
                    record(kind);
                }
            }
            rebase();
        }),
    );

    // ── tool, mode, lighting variant ────────────────────────────────────

    let lastTool = store.get(activeToolAtom);
    teardown.push(
        store.sub(activeToolAtom, () => {
            const tool = store.get(activeToolAtom);
            if (tool !== lastTool) {
                lastTool = tool;
                record("tool.select");
            }
        }),
    );

    let lastSubtract = store.get(subtractModeAtom);
    teardown.push(
        store.sub(subtractModeAtom, () => {
            const subtract = store.get(subtractModeAtom);
            if (subtract !== lastSubtract) {
                lastSubtract = subtract;
                record("mode.subtract");
            }
        }),
    );

    let lastVariant = store.get(filterGammaCombinationAtom);
    teardown.push(
        store.sub(filterGammaCombinationAtom, () => {
            const variant = store.get(filterGammaCombinationAtom);
            const previous = lastVariant;
            lastVariant = variant;
            // The first assignment is the page choosing a default, not a switch.
            if (previous.filter === null || !editing()) {
                return;
            }
            if (
                variant.filter !== previous.filter ||
                variant.gamma !== previous.gamma ||
                variant.rotation !== previous.rotation
            ) {
                record("variant.switch");
            }
        }),
    );

    // ── focus and lifecycle ─────────────────────────────────────────────

    const onVisibility = () => {
        if (document.hidden) {
            registry.suspend("hidden");
            flush();
        }
    };
    const onBlur = () => {
        registry.suspend("blur");
        flush();
    };
    const onPageHide = () => {
        registry.suspend("session-end");
        flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    teardown.push(() => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("pagehide", onPageHide);
    });

    // ── presence and idle ───────────────────────────────────────────────

    let lastInputWallMs = Date.now();
    let lastInputMonotonicMs = performance.now();

    const markInput = () => {
        const nowMonotonicMs = performance.now();
        if (nowMonotonicMs - lastInputMonotonicMs < PRESENCE_THROTTLE_MS) {
            return;
        }
        lastInputWallMs = Date.now();
        lastInputMonotonicMs = nowMonotonicMs;
        // Moving at all is proof the annotator is back; no click required.
        if (store.get(idlePromptAtom) !== null) {
            store.set(idlePromptAtom, null);
            record("idle.resumed");
            flush();
        }
    };

    for (const type of ["pointermove", "pointerdown", "keydown", "wheel"]) {
        window.addEventListener(type, markInput, {
            passive: true,
            capture: true,
        });
    }
    teardown.push(() => {
        for (const type of ["pointermove", "pointerdown", "keydown", "wheel"]) {
            window.removeEventListener(type, markInput, {capture: true});
        }
    });

    const checkIdle = () => {
        if (!registry.isTaskOpen() || !editing()) {
            return;
        }
        if (store.get(idlePromptAtom) !== null) {
            return;
        }
        const threshold = registry.hasObjectInProgress()
            ? IDLE_WITH_OBJECT_MS
            : IDLE_MS;
        if (performance.now() - lastInputMonotonicMs < threshold) {
            return;
        }
        // Backdated to the last input: the threshold itself is not work.
        registry.suspend("idle", lastInputMonotonicMs);
        record("idle.prompted");
        store.set(idlePromptAtom, {
            idleSinceWallMs: lastInputWallMs,
            deadlineWallMs: Date.now() + IDLE_GRACE_MS,
        });
    };

    const heartbeat = setInterval(() => {
        checkIdle();
        flush();
    }, HEARTBEAT_MS);
    teardown.push(() => clearInterval(heartbeat));

    return () => {
        for (const stop of teardown) {
            stop();
        }
        if (fieldEditTimer) {
            clearTimeout(fieldEditTimer);
        }
    };
}
