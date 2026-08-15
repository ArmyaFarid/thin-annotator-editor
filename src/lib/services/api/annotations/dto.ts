import type {RLEDTO} from "@/lib/services/api/task/dto.ts";

// The exported annotation document — COCO-flavoured, and genuinely different
// from the domain model: masks are flattened to a single RLE segmentation and
// the mineral fields are spread alongside it.

export interface CocoImageDTO {
    file_name: string | undefined;
    width: number;
    height: number;
}

export interface CocoMetadataDTO {
    lightning_modality: string | null;
    gamma: string;
    rotation: number;
}

export interface CocoLicenseDTO {
    name: string;
    url: string;
}

export interface CocoAnnotationDTO {
    id: number;
    segmentation: RLEDTO;
    mineralIds?: (string | null)[];
    [property: string]: unknown;
}

export interface CocoDocumentDTO {
    metadata: CocoMetadataDTO;
    license: CocoLicenseDTO;
    image: CocoImageDTO;
    annotations: CocoAnnotationDTO[];
}

/** POST /api/annotations/save */
export interface SaveAnnotationRequestDTO {
    pairsCode: string;
    sampleId: string;
    imageId: string | undefined;
    data: CocoDocumentDTO;
}
