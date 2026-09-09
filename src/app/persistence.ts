import type {Mask} from "@/app/atom.ts";
import {
    TASK_FORMAT_VERSION,
    type MaskDTO,
} from "@/lib/services/api/task/dto.ts";
import {dtoToMasks, masksToDto} from "@/lib/services/api/task/mappers.ts";

// Drafts are the same document as a backend save, just stored locally, so they
// share one format definition. A draft written before versioning has no
// `version` field and no `masks` wrapper change — dtoToMasks handles both.
interface DraftDTO {
    version?: number;
    masks: MaskDTO[];
}

function draftKey(pairsCode: string, sampleId: string): string {
    return `sam2_annotation_draft:${pairsCode}/${sampleId}`;
}

export function saveLocalDraft(
    pairsCode: string,
    sampleId: string,
    masks: Mask[],
): void {
    try {
        const key = draftKey(pairsCode, sampleId);
        if (masks.length === 0) {
            localStorage.removeItem(key);
        } else {
            const draft: DraftDTO = {
                version: TASK_FORMAT_VERSION,
                masks: masksToDto(masks),
            };
            localStorage.setItem(key, JSON.stringify(draft));
        }
    } catch {
        /* ignore */
    }
}

export function loadLocalDraft(
    pairsCode: string,
    sampleId: string,
): {masks: Mask[]} | null {
    try {
        const raw = localStorage.getItem(draftKey(pairsCode, sampleId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as DraftDTO;
        const masks = dtoToMasks(parsed?.masks);
        if (masks.length === 0) {
            return null;
        }
        return {masks};
    } catch {
        return null;
    }
}

export function clearDraft(pairsCode: string, sampleId: string): void {
    try {
        localStorage.removeItem(draftKey(pairsCode, sampleId));
    } catch {
        /* ignore */
    }
}
