// Annotation timing. The only module the application imports.
//
// Everything is derived by subscribing to existing atoms — no component emits
// anything. Every function here is a no-op when the flag is off and swallows
// its own failures: timing must never interrupt an annotator.

import Logger from "@/common/logger/Logger.ts";
import type {MaskDTO} from "@/lib/services/api/task/dto.ts";
import {getDefaultStore} from "jotai";
import {idlePromptAtom} from "@/telemetry/atoms.ts";
import type {TaskTimingDTO} from "@/telemetry/dto.ts";
import {ENABLED} from "@/telemetry/flag.ts";
import {responseToSnapshot, snapshotToMaskDtos} from "@/telemetry/mappers.ts";
import {SpanRegistry} from "@/telemetry/spans.ts";
import {recoverWorkInProgress} from "@/telemetry/store.ts";
import {attachSubscriptions} from "@/telemetry/subscriptions.ts";
import type {TaskKey} from "@/telemetry/types.ts";

let registry: SpanRegistry | null = null;
let detach: (() => void) | null = null;

/** Call once, from main.tsx, before render. */
export function initTelemetry(): void {
    if (!ENABLED || registry) {
        return;
    }
    try {
        const created = new SpanRegistry();
        const recovered = recoverWorkInProgress();
        if (recovered) {
            created.absorb(recovered);
        }
        detach = attachSubscriptions(created);
        registry = created;
    } catch (error) {
        Logger.warn("[timing] failed to start, continuing without it", error);
        registry = null;
    }
}

export function stopTelemetry(): void {
    detach?.();
    detach = null;
    registry = null;
}

/**
 * The annotator answered the inactivity prompt. Reopens the interval that going
 * idle closed.
 */
export function resumeFromIdle(): void {
    if (!ENABLED || !registry) {
        return;
    }
    try {
        const store = getDefaultStore();
        // Any input already dismisses the prompt, so the button click arrives
        // second. Recording again would double-count the resume.
        if (store.get(idlePromptAtom) === null) {
            return;
        }
        store.set(idlePromptAtom, null);
        registry.recordInteraction("idle.resumed");
    } catch (error) {
        Logger.warn("[timing] could not resume from idle", error);
    }
}

/** The prompt went unanswered and the editor is being closed for them. */
export function recordIdleForcedExit(): void {
    if (!ENABLED || !registry) {
        return;
    }
    try {
        getDefaultStore().set(idlePromptAtom, null);
        registry.recordInteraction("idle.forced-exit");
    } catch (error) {
        Logger.warn("[timing] could not record the forced exit", error);
    }
}

/**
 * Read timing back off a loaded task. `dtoToMasks` drops unknown fields, so
 * without this a reopened task would overwrite everything measured before.
 */
export function absorbLoadedTiming(
    taskKey: TaskKey,
    annotations: unknown,
    taskTiming: unknown,
): void {
    if (!ENABLED || !registry) {
        return;
    }
    try {
        const snapshot = responseToSnapshot(taskKey, annotations, taskTiming);
        if (snapshot) {
            registry.absorb(snapshot);
        }
    } catch (error) {
        Logger.warn("[timing] could not read stored timing", error);
    }
}

/**
 * Fold timing into an outgoing save. Open intervals are projected, not closed,
 * so saving mid-session neither mutates state nor loses the running interval.
 */
export function attachTiming(masks: MaskDTO[]): {
    data: MaskDTO[];
    taskTiming?: TaskTimingDTO;
} {
    if (!ENABLED || !registry) {
        return {data: masks};
    }
    try {
        const snapshot = registry.snapshot();
        if (!snapshot) {
            return {data: masks};
        }
        return {
            data: snapshotToMaskDtos(masks, snapshot),
            taskTiming: snapshot.task,
        };
    } catch (error) {
        Logger.warn("[timing] could not attach timing to save", error);
        return {data: masks};
    }
}
