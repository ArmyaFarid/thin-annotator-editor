import type {MaskDTO} from "@/lib/services/api/task/dto.ts";

/** POST /api/batch/create — the backend picks the root folder and scans it. */
export interface CreateBatchResponseDTO {
    batchId: string;
    name: string;
    rootPath: string;
    taskCount: number;
}

/** GET /api/batch */
export type ListBatchesResponseDTO = CreateBatchResponseDTO[];

/**
 * POST /api/batch/next | /api/batch/prev
 *
 * The openTaskFromFolder payload plus where the backend's cursor landed.
 * `index`/`total` are a readout only — the cursor lives on the backend and the
 * frontend never addresses a task by position. `hasPrev`/`hasNext` drive the
 * buttons so a change of ordering strategy needs no frontend change.
 */
export interface BatchTaskResponseDTO {
    pairsCode: string;
    sampleId: string;
    annotations: MaskDTO[] | null;
    image_count: number;
    index: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
}
