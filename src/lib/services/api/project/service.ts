import api from "@/lib/services/api/axios.ts";
import type {Mask} from "@/app/atom.ts";
import {
    PROJECT_FORMAT_VERSION,
    type LoadProjectResponseDTO,
    type SaveProjectRequestDTO,
} from "@/lib/services/api/project/dto.ts";
import {dtoToMasks, masksToDto} from "@/lib/services/api/project/mappers.ts";

const BASE = "/api/project";

export interface ProjectRef {
    pairsCode: string;
    sampleId: string;
}

export const projectService = {
    /** Returns the saved masks, or an empty array when the project has none. */
    load: async ({pairsCode, sampleId}: ProjectRef): Promise<Mask[]> => {
        const res = await api.get<LoadProjectResponseDTO>(`${BASE}/load`, {
            params: {pairsCode, sampleId},
        });
        return dtoToMasks(res.data?.annotations ?? []);
    },

    save: async ({
        pairsCode,
        sampleId,
        masks,
    }: ProjectRef & {masks: Mask[]}): Promise<void> => {
        const body: SaveProjectRequestDTO = {
            pairsCode,
            sampleId,
            version: PROJECT_FORMAT_VERSION,
            data: masksToDto(masks),
        };
        await api.post(`${BASE}/save`, body);
    },
};
