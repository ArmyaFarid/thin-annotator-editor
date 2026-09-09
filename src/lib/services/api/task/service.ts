import api from "@/lib/services/api/axios.ts";
import type {Mask} from "@/app/atom.ts";
import {
    TASK_FORMAT_VERSION,
    type LoadTaskResponseDTO,
    type SaveTaskRequestDTO,
    OpenTaskFromFolderResponseDTO,
} from "@/lib/services/api/task/dto.ts";
import {dtoToMasks, masksToDto} from "@/lib/services/api/task/mappers.ts";
import {EmptyFolderError} from "@/lib/services/api/folder/service.ts";
import {TaskFromFolder} from "@/lib/services/api/task/domain.ts";

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
            version: TASK_FORMAT_VERSION,
            data: masksToDto(masks),
        };
        await api.post(`${BASE}/save`, body);
    },

    /** Opens the OS folder picker on the backend and load task. */
    openTaskFromFolder: async (): Promise<TaskFromFolder> => {
        const res = await api.post<OpenTaskFromFolderResponseDTO>(
            `${BASE}/open-from-folder`,
        );
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
