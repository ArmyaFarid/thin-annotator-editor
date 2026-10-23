import api from "@/lib/services/api/axios.ts";
import type {
    PairsResponseDTO,
    SegmentationResponseDTO,
} from "@/lib/services/api/editor/dto.ts";
import type {
    Pairs,
    PointsInput,
    SlicInput,
    SlicLabelMapResult,
} from "@/lib/services/api/editor/domain.ts";
import {
    dtoToPairs,
    dtoToRleMask,
    dtoToSlicLabelMap,
    pointsInputToDto,
    slicInputToDto,
} from "@/lib/services/api/editor/mappers.ts";
import type {RLEMask} from "@/app/atom.ts";
import type {TaskRef} from "@/lib/services/api/task/service.ts";

/** Same SPA-fallback guard as `BatchEndpointError`: an unknown route is HTML at 200. */
export class EditorEndpointError extends Error {
    constructor(route: string) {
        super(`${route} did not return JSON`);
        this.name = "EditorEndpointError";
    }
}

function assertObject(data: unknown, route: string): void {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new EditorEndpointError(route);
    }
}

export const editorService = {
    pairs: async ({pairsCode, sampleId}: TaskRef): Promise<Pairs> => {
        const res = await api.get<PairsResponseDTO>("/api/pairs", {
            params: {pairsCode, sampleId},
        });
        assertObject(res.data, "/api/pairs");
        return dtoToPairs(res.data);
    },

    addPoints: async (input: PointsInput): Promise<RLEMask | null> => {
        const res = await api.post<SegmentationResponseDTO>(
            "/api/segmentation/sam2",
            pointsInputToDto(input),
        );
        assertObject(res.data, "/api/segmentation/sam2");
        return dtoToRleMask(res.data);
    },

    slicLabelMap: async (input: SlicInput): Promise<SlicLabelMapResult> => {
        const res = await api.post<SegmentationResponseDTO>(
            "/api/segmentation/slic",
            slicInputToDto(input),
        );
        assertObject(res.data, "/api/segmentation/slic");
        return dtoToSlicLabelMap(res.data);
    },
};
