/**
 * Undo / redo history.
 *
 * Approach: snapshot-based. Before each user-driven mutation, the four
 * "annotation state" atoms (prompts, masks, currentMask, slicPrompts) are
 * captured into a `HistoryEntry`. Undo restores the previous entry; redo
 * walks forward through entries the user undid.
 *
 * The `label` on each entry is a STRUCTURED discriminated union — the same
 * shape an `event` would have in an event-driven architecture — so that:
 *   1) The history can render meaningful labels in any future UI
 *      ("Annuler : Ajout de point", "Annuler : Suppression de masque").
 *   2) The migration path to a real event-sourced system (apply/invert
 *      reducers, replay, collaborative editing) is just: rename the field,
 *      add reducers, stop snapshotting state. The mutation sites stay
 *      identical.
 *
 * Memory: entries hold references to immutable atom values. Because the
 * existing setters use immutable updates, snapshots structurally share
 * objects that didn't change. Practical cost is ≲ 1 MB even with 50 entries.
 */

import {atom} from "jotai";
import {
    promptsAtom,
    masksAtom,
    currentMaskAtom,
    slicPromptsAtom,
    type Prompt,
    type Mask,
    type SlicPrompt,
} from "@/app/atom.ts";

const MAX_HISTORY = 50;

// ── Structured labels (event-shaped, but for now used only as metadata). ──
export type HistoryLabel =
    | {action: "keypoint.add"; payload: {x: number; y: number; label: 0 | 1}}
    | {action: "bbox.add"; payload: {x: number; y: number; w: number; h: number}}
    | {action: "slic-bbox.set"; payload: {x: number; y: number; w: number; h: number}}
    | {action: "polygon.add"; payload: {maskId?: number; vertexCount: number}}
    | {action: "freeform.add"; payload: {maskId?: number; pointCount: number}}
    | {action: "layer.delete"; payload: {maskId: number; layerId: number}}
    | {action: "vertex.move"; payload: {maskId: number; layerId: number}}
    | {action: "mask.delete"; payload: {maskId: number}}
    | {action: "mask.rename"; payload: {maskId: number}}
    | {action: "mask.merge"; payload: {maskId: number}}
    | {action: "mask.extract-contours"; payload: {maskId: number}}
    | {action: "sam.result"; payload: {prompts: number}}
    | {action: "slic.result"; payload: {regions: number}}
    | {action: "other"; payload: {note: string}};

export interface HistoryEntry {
    prompts: Prompt[];
    masks: Mask[];
    currentMask: number;
    slicPrompts: SlicPrompt | undefined;
    label: HistoryLabel;
}

interface HistoryState {
    past: HistoryEntry[];
    future: HistoryEntry[];
}

export const historyAtom = atom<HistoryState>({past: [], future: []});

// ── Write-only action atoms ──────────────────────────────────────────────

/**
 * Snapshot the CURRENT state and push it to `past`. Clears `future` (new
 * branch). Call this BEFORE any mutation you want to be undoable.
 */
export const commitHistoryAtom = atom(null, (get, set, label: HistoryLabel) => {
    const snapshot: HistoryEntry = {
        prompts: get(promptsAtom),
        masks: get(masksAtom),
        currentMask: get(currentMaskAtom),
        slicPrompts: get(slicPromptsAtom),
        label,
    };
    set(historyAtom, (h) => ({
        past: [...h.past, snapshot].slice(-MAX_HISTORY),
        future: [],
    }));
});

/**
 * Pop the most recent entry from `past`, push CURRENT state onto `future`,
 * and restore atom values from the popped entry. No-op when past is empty.
 */
export const undoAtom = atom(null, (get, set) => {
    const h = get(historyAtom);
    if (h.past.length === 0) return;
    const previous = h.past[h.past.length - 1];
    const current: HistoryEntry = {
        prompts: get(promptsAtom),
        masks: get(masksAtom),
        currentMask: get(currentMaskAtom),
        slicPrompts: get(slicPromptsAtom),
        label: previous.label, // future entry keeps the label of the undone action
    };
    set(promptsAtom, previous.prompts);
    set(masksAtom, previous.masks);
    set(currentMaskAtom, previous.currentMask);
    set(slicPromptsAtom, previous.slicPrompts);
    set(historyAtom, {
        past: h.past.slice(0, -1),
        future: [...h.future, current],
    });
});

/** Symmetric counterpart of undo. */
export const redoAtom = atom(null, (get, set) => {
    const h = get(historyAtom);
    if (h.future.length === 0) return;
    const next = h.future[h.future.length - 1];
    const current: HistoryEntry = {
        prompts: get(promptsAtom),
        masks: get(masksAtom),
        currentMask: get(currentMaskAtom),
        slicPrompts: get(slicPromptsAtom),
        label: next.label,
    };
    set(promptsAtom, next.prompts);
    set(masksAtom, next.masks);
    set(currentMaskAtom, next.currentMask);
    set(slicPromptsAtom, next.slicPrompts);
    set(historyAtom, {
        past: [...h.past, current],
        future: h.future.slice(0, -1),
    });
});

/** Clear all history. Call when loading a different sample, etc. */
export const clearHistoryAtom = atom(null, (_get, set) => {
    set(historyAtom, {past: [], future: []});
});

// ── Derived read-only atoms for UI affordances. ──────────────────────────

export const canUndoAtom = atom((get) => get(historyAtom).past.length > 0);
export const canRedoAtom = atom((get) => get(historyAtom).future.length > 0);
