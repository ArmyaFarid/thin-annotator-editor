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

/**
 * The backend answers an unknown route with the SPA's index.html at status 200,
 * so a missing endpoint arrives as an HTML string rather than a rejection. Left
 * unchecked it reaches the component as data and crashes the render.
 */
export class BatchEndpointError extends Error {
    constructor(route: string) {
        super(`${route} did not return JSON`);
        this.name = "BatchEndpointError";
    }
}

function isObject(data: unknown): data is Record<string, unknown> {
    return typeof data === "object" && data !== null && !Array.isArray(data);
}

export interface Batch {
    id: string;
    name: string;
    rootPath: string;
    taskCount: number;
}

export interface BatchTask {
    taskId: string;
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
    index: number;
    total: number;
    isAnnotated: boolean;
    hasPrev: boolean;
    hasNext: boolean;
}

/** `done` is returned in place of a task once every task is annotated. */
export type BatchPosition =
    | {kind: "task"; task: BatchTask}
    | {kind: "done"; total: number};

function toBatchTask(dto: BatchTaskResponseDTO): BatchTask {
    return {
        taskId: dto.taskId,
        pairsCode: dto.pairsCode,
        sampleId: dto.sampleId,
        annotations: dto.annotations ? dtoToMasks(dto.annotations) : null,
        index: dto.index,
        total: dto.total,
        isAnnotated: dto.isAnnotated,
        hasPrev: dto.hasPrev,
        hasNext: dto.hasNext,
    };
}

function toPosition(data: unknown, route: string): BatchPosition {
    if (!isObject(data)) {
        throw new BatchEndpointError(route);
    }
    if (data.done === true) {
        return {kind: "done", total: Number(data.total) || 0};
    }
    if (typeof data.pairsCode !== "string") {
        throw new BatchEndpointError(route);
    }
    return {
        kind: "task",
        task: toBatchTask(data as unknown as BatchTaskResponseDTO),
    };
}

async function move(
    batchId: string,
    route: "current" | "next" | "prev",
): Promise<BatchPosition> {
    const res = await api.post(`${BASE}/${route}`, {batchId});
    return toPosition(res.data, `${BASE}/${route}`);
}

export const batchService = {
    /** Opens the OS folder picker on the backend and scans the chosen root. */
    create: async (): Promise<Batch> => {
        const res = await api.post<CreateBatchResponseDTO>(`${BASE}/create`);
        if (!isObject(res.data) || typeof res.data.id !== "string") {
            throw new BatchEndpointError(`${BASE}/create`);
        }
        if (res.data.taskCount === 0) {
            throw new NoMatchingTaskError();
        }
        return res.data;
    },

    list: async (): Promise<Batch[]> => {
        const res = await api.get<ListBatchesResponseDTO>(BASE);
        if (!Array.isArray(res.data)) {
            throw new BatchEndpointError(BASE);
        }
        return res.data;
    },

    /** Read-only: where the batch stands, without moving past anything. */
    current: (batchId: string) => move(batchId, "current"),
    next: (batchId: string) => move(batchId, "next"),
    prev: (batchId: string) => move(batchId, "prev"),
};
