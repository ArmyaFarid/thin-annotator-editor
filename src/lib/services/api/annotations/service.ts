import api from "@/lib/services/api/axios.ts";
import type {SaveAnnotationRequestDTO} from "@/lib/services/api/annotations/dto.ts";
import {
    masksToCocoDocument,
    type CocoBuildInput,
} from "@/lib/services/api/annotations/mappers.ts";

export interface ExportAnnotationInput extends CocoBuildInput {
    pairsCode: string;
    sampleId: string;
}

export const annotationsService = {
    /** Builds the COCO document for the active image and saves it. */
    export: async ({
        pairsCode,
        sampleId,
        ...build
    }: ExportAnnotationInput): Promise<void> => {
        const body: SaveAnnotationRequestDTO = {
            pairsCode,
            sampleId,
            imageId: build.activeImage.id,
            data: masksToCocoDocument(build),
        };
        await api.post("/api/annotations/save", body);
    },
};
