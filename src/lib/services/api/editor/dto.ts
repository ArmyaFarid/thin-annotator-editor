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

/** `[x, y, w, h]` — every box in the segmentation API has this shape. */
export type BoxDTO = [number, number, number, number];

/**
 * POST /api/segmentation/sam2 — all keys required, unknown keys answer 400.
 * One label per point (`-1` is ignored); only the first box is used.
 */
export interface Sam2RequestDTO {
    imageId: string;
    points: [number, number][];
    labels: number[];
    bboxes: BoxDTO[];
}

/** POST /api/segmentation/slic */
export interface SlicRequestDTO {
    imageId: string;
    bbox: BoxDTO;
}

interface SegmentationEnvelopeDTO {
    imageWidth: number;
    imageHeight: number;
}

/** Holds exactly one mask today, all zeros when there is no prompt. */
export interface MaskListDTO extends SegmentationEnvelopeDTO {
    kind: "masks";
    masks: RLEDTO[];
}

/**
 * `width`/`height` are the dimensions of `data` and may be smaller than the
 * requested bbox when it is clipped at the image edge; `x`/`y` place it.
 */
export interface LabelMapDTO extends SegmentationEnvelopeDTO {
    kind: "labelMap";
    x: number;
    y: number;
    width: number;
    height: number;
    dtype: "uint16";
    data: string;
}

export type SegmentationResponseDTO = MaskListDTO | LabelMapDTO;
