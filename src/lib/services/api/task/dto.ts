// Wire + on-disk shapes for a saved task.
//
// These are deliberately declared separately from the `Mask` domain type rather
// than reusing it. `Mask` is the in-memory editing model and is expected to keep
// changing (ids are scheduled to move from Date.now() numbers to UUID strings);
// this file is the format already written to disk, which must keep loading.
// When the two diverge, absorb it in mappers.ts — never by editing history.

export const TASK_FORMAT_VERSION = 1;

export interface RLEDTO {
    counts: string;
    size: [number, number];
}

export interface PolygonDTO {
    kind: "polygon";
    id: number;
    vertices: {x: number; y: number}[];
    fillColor: string;
    strokeColor: string;
}

export interface MaskLayerDTO {
    id: number;
    source?: "sam" | "manual";
    rleMask?: RLEDTO;
    canvasShape?: PolygonDTO;
    layerKind?: "fill" | "hole";
}

export interface MaskDTO {
    id: number;
    label: string;
    layers: MaskLayerDTO[];
    point_labels: number[];
    point_coords: [number, number][];
    color: {r: number; g: number; b: number; a: number};
    annotation?: unknown;
}

/** POST /api/task/save */
export interface SaveTaskRequestDTO {
    pairsCode: string;
    sampleId: string;
    version: number;
    data: MaskDTO[];
}

/**
 * GET /api/task/load.
 * The response envelope says `annotations` while the request says `data` — an
 * existing asymmetry in the backend contract, documented here rather than
 * silently absorbed.
 * `version` is absent on tasks saved before this format existed (v0).
 */
export interface LoadTaskResponseDTO {
    version?: number;
    annotations: MaskDTO[] | null;
}
