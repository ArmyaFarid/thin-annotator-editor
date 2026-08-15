import api from "@/lib/services/api/axios.ts";
import type {Mask} from "@/app/atom.ts";
import {
    PROJECT_FORMAT_VERSION,
    type LoadTaskResponseDTO,
    type SaveTaskRequestDTO,
} from "@/lib/services/api/task/dto.ts";
import {dtoToMasks, masksToDto} from "@/lib/services/api/task/mappers.ts";

// The backend still calls this resource a project; only the URL keeps that name.
const BASE = "/api/task";

export interface TaskRef {
    pairsCode: string;
    sampleId: string;
}

export const taskService = {
    /** Returns the saved masks, or an empty array when the task has none. */
    load: async ({pairsCode, sampleId}: TaskRef): Promise<Mask[]> => {
        const res = await api.get<LoadTaskResponseDTO>(`${BASE}/load`, {
            params: {pairsCode, sampleId},
        });
        return dtoToMasks(res.data?.annotations ?? []);
    },

    save: async ({
        pairsCode,
        sampleId,
        masks,
    }: TaskRef & {masks: Mask[]}): Promise<void> => {
        const body: SaveTaskRequestDTO = {
            pairsCode,
            sampleId,
            version: PROJECT_FORMAT_VERSION,
            data: masksToDto(masks),
        };
        await api.post(`${BASE}/save`, body);
    },
};
