import type {RLEDTO} from "@/lib/services/api/task/dto.ts";

export interface ImageDTO {
    id: string;
    path: string;
    url: string;
    width: number;
    height: number;
}

export interface AcquiredImageDTO {
    polarizedFilterType: string;
    gamma: number | null;
    rotation: number | null;
    image: ImageDTO;
}

/** GET /api/pairs?pairsCode=…&sampleId=… — an unknown FOV answers with empty lists. */
export interface PairsResponseDTO {
    pairsCode: string;
    sampleId: string;
    polarizedFilterTypes: string[];
    rotations: (number | null)[];
    gammas: (number | null)[];
    acquiredImages: AcquiredImageDTO[];
}

/**
 * POST /api/inference/points
 * `bboxes` are corners `[x0, y0, x1, y1]`; the backend uses only the first.
 */
export interface PointsRequestDTO {
    imageId: string;
    points: [number, number][];
    labels: number[];
    bboxes: [number, number, number, number][];
}

export interface PointsResponseDTO {
    rleMaskList: {objectId: number; rleMask: RLEDTO}[];
}

/** POST /api/inference/slic-label-map — `bbox` is `[x, y, w, h]`, not corners. */
export interface SlicLabelMapRequestDTO {
    imageId: string;
    bbox: [number, number, number, number];
}

export interface SlicLabelMapResponseDTO {
    data: string;
    height: number;
    width: number;
    dtype: string;
    bbox: {x: number; y: number; w: number; h: number};
}
