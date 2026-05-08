import type {Mask} from "@/app/atom.ts";

interface DraftState {
    masks: Mask[];
}

function draftKey(pairsCode: string, sampleId: string): string {
    return `sam2_annotation_draft:${pairsCode}/${sampleId}`;
}

export function saveDraft(pairsCode: string, sampleId: string, masks: Mask[]): void {
    try {
        const key = draftKey(pairsCode, sampleId);
        if (masks.length === 0) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify({masks}));
        }
    } catch {}
}

export function loadDraft(pairsCode: string, sampleId: string): DraftState | null {
    try {
        const raw = localStorage.getItem(draftKey(pairsCode, sampleId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DraftState;
        if (!Array.isArray(parsed.masks) || parsed.masks.length === 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearDraft(pairsCode: string, sampleId: string): void {
    try {
        localStorage.removeItem(draftKey(pairsCode, sampleId));
    } catch {}
}
