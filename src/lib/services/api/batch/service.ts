import api from "@/lib/services/api/axios.ts";
import type {Mask} from "@/app/atom.ts";
import type {
    BatchTaskResponseDTO,
    CreateBatchResponseDTO,
    ListBatchesResponseDTO,
} from "@/lib/services/api/batch/dto.ts";
import {dtoToMasks} from "@/lib/services/api/task/mappers.ts";

const BASE = "/api/batch";

/** A scanned root folder holding no subfolder that matches the task structure. */
export class NoMatchingTaskError extends Error {
    constructor() {
        super("no folder matching the task structure was found");
        this.name = "NoMatchingTaskError";
    }
}

export interface Batch {
    batchId: string;
    name: string;
    rootPath: string;
    taskCount: number;
}

export interface BatchTask {
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
    index: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
}

function toBatchTask(dto: BatchTaskResponseDTO): BatchTask {
    return {
        pairsCode: dto.pairsCode,
        sampleId: dto.sampleId,
        annotations: dto.annotations ? dtoToMasks(dto.annotations) : null,
        index: dto.index,
        total: dto.total,
        hasPrev: dto.hasPrev,
        hasNext: dto.hasNext,
    };
}

export const batchService = {
    /** Opens the OS folder picker on the backend and scans the chosen root. */
    create: async (): Promise<Batch> => {
        const res = await api.post<CreateBatchResponseDTO>(`${BASE}/create`);
        if (res.data.taskCount === 0) {
            throw new NoMatchingTaskError();
        }
        return res.data;
    },

    list: async (): Promise<Batch[]> => {
        const res = await api.get<ListBatchesResponseDTO>(BASE);
        return res.data ?? [];
    },

    next: async (batchId: string): Promise<BatchTask> => {
        const res = await api.post<BatchTaskResponseDTO>(`${BASE}/next`, {
            batchId,
        });
        return toBatchTask(res.data);
    },

    prev: async (batchId: string): Promise<BatchTask> => {
        const res = await api.post<BatchTaskResponseDTO>(`${BASE}/prev`, {
            batchId,
        });
        return toBatchTask(res.data);
    },
};
