import type {MaskDTO} from "@/lib/services/api/task/dto.ts";

/** POST /api/batch/create — the backend picks the root folder and scans it. */
export interface CreateBatchResponseDTO {
    id: string;
    name: string;
    rootPath: string;
    taskCount: number;
}

/** GET /api/batch */
export type ListBatchesResponseDTO = CreateBatchResponseDTO[];

/**
 * POST /api/batch/current | /next | /prev
 *
 * `index`/`total` are a readout only — the cursor lives on the backend and the
 * frontend never addresses a task by position. `hasPrev`/`hasNext` drive the
 * buttons so a change of ordering strategy needs no frontend change.
 */
export interface BatchTaskResponseDTO {
    taskId: string;
    pairsCode: string;
    sampleId: string;
    annotations: MaskDTO[] | null;
    imageCount: number;
    index: number;
    total: number;
    isAnnotated: boolean;
    hasPrev: boolean;
    hasNext: boolean;
}

/** Returned in place of a task once every task in the batch is annotated. */
export interface BatchDoneResponseDTO {
    done: true;
    total: number;
}
