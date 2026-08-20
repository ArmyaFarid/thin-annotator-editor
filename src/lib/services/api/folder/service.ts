import api from "@/lib/services/api/axios.ts";
import type {Mask} from "@/app/atom.ts";
import type {MaskDTO} from "@/lib/services/api/task/dto.ts";
import {dtoToMasks} from "@/lib/services/api/task/mappers.ts";

/**
 * The backend answers HTTP 200 with `image_count: 0` when the chosen directory
 * holds no usable images. That is a failure from the user's point of view, so
 * the service raises it as one; callers branch on the class to pick a message.
 */
export class EmptyFolderError extends Error {
    constructor() {
        super("selected folder contains no images");
        this.name = "EmptyFolderError";
    }
}

interface PickFolderResponseDTO {
    pairsCode: string;
    sampleId: string;
    annotations: MaskDTO[] | null;
    image_count: number;
}

export interface PickedFolder {
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
}

export const folderService = {
    /** Opens the OS folder picker on the backend and imports what it finds. */
    pick: async (): Promise<PickedFolder> => {
        const res = await api.post<PickFolderResponseDTO>("/api/pick-folder");
        if (res.data.image_count === 0) {
            throw new EmptyFolderError();
        }
        return {
            pairsCode: res.data.pairsCode,
            sampleId: res.data.sampleId,
            annotations: res.data.annotations
                ? dtoToMasks(res.data.annotations)
                : null,
        };
    },
};
