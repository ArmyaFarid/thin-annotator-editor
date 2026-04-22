import type {Mask} from "@/app/atom.ts";

const STORAGE_KEY = "sam2_annotation_draft";

interface DraftState {
    masks: Mask[];
    sessionId: string | undefined;
}

export function saveDraft(masks: Mask[], sessionId: string | undefined): void {
    try {
        if (masks.length === 0 && !sessionId) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({masks, sessionId}));
        }
    } catch {}
}

export function loadDraft(): DraftState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DraftState;
        if (!Array.isArray(parsed.masks) || parsed.masks.length === 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearDraft(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
}
