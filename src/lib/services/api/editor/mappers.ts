import type {RLEMask} from "@/app/atom.ts";
import type {
    AcquiredImageDTO,
    PairsResponseDTO,
    PointsRequestDTO,
    PointsResponseDTO,
    SlicLabelMapRequestDTO,
    SlicLabelMapResponseDTO,
} from "@/lib/services/api/editor/dto.ts";
import type {
    Pairs,
    PointsInput,
    SlicInput,
    SlicLabelMapResult,
} from "@/lib/services/api/editor/domain.ts";
import Logger from "@/common/logger/Logger.ts";

function isRle(v: unknown): v is RLEMask {
    const r = v as RLEMask;
    return (
        typeof r?.counts === "string" &&
        Array.isArray(r.size) &&
        r.size.length === 2 &&
        r.size.every((n) => typeof n === "number")
    );
}

function isAcquiredImage(v: unknown): v is AcquiredImageDTO {
    const a = v as AcquiredImageDTO;
    const img = a?.image;
    return (
        typeof a?.polarizedFilterType === "string" &&
        typeof img?.id === "string" &&
        typeof img.url === "string" &&
        typeof img.path === "string" &&
        typeof img.width === "number" &&
        typeof img.height === "number"
    );
}

export function pointsInputToDto({
    image,
    prompts,
}: PointsInput): PointsRequestDTO {
    const pointPrompts = prompts.filter((p) => !p.bbox);
    return {
        imageId: image.id,
        points: pointPrompts.map((p) => p.point_coords),
        labels: pointPrompts.map((p) => p.point_labels),
        bboxes: prompts
            .filter((p) => p.bbox != null)
            .map((p) => {
                const {left, top, width, height} = p.bbox!;
                return [Math.round(left), top, left + width, top + height];
            }),
    };
}

export function slicInputToDto({
    image,
    bbox,
}: SlicInput): SlicLabelMapRequestDTO {
    return {
        imageId: image.id,
        bbox: [
            Math.round(bbox.left),
            Math.round(bbox.top),
            Math.round(bbox.width),
            Math.round(bbox.height),
        ],
    };
}

/** Malformed entries are dropped with a warning, like `dtoToMasks`. */
export function dtoToPairs(dto: PairsResponseDTO): Pairs {
    const raw = Array.isArray(dto.acquiredImages) ? dto.acquiredImages : [];
    const valid = raw.filter(isAcquiredImage);
    if (valid.length < raw.length) {
        Logger.warn(
            `[pairs] dropped ${raw.length - valid.length} malformed acquired image(s)`,
        );
    }
    const variants = valid.map((a) => ({
        filter: a.polarizedFilterType,
        gamma: a.gamma ?? null,
        rotation: a.rotation ?? null,
    }));
    return {
        variants,
        acquiredImages: valid.map((a, i) => ({
            image: a.image,
            combination: variants[i],
        })),
    };
}

/** The backend returns a single mask; `null` when it returned none usable. */
export function dtoToRleMask(dto: PointsResponseDTO): RLEMask | null {
    const rle = dto.rleMaskList?.[0]?.rleMask;
    return isRle(rle) ? rle : null;
}

// The backend sends `arr.tobytes()` base64-encoded — raw, C-order, native
// (little-endian) byte order, so a typed-array view over the bytes is enough.
function decodeLabelMap(
    data: string,
    dtype: string,
    w: number,
    h: number,
): Uint16Array {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    switch (dtype) {
        case "uint16":
            return new Uint16Array(bytes.buffer, bytes.byteOffset, w * h);
        case "uint8":
            return Uint16Array.from(bytes.subarray(0, w * h));
        case "int32":
        case "uint32":
            return Uint16Array.from(
                new Uint32Array(bytes.buffer, bytes.byteOffset, w * h),
            );
        default:
            throw new Error(`unsupported SLIC label map dtype: ${dtype}`);
    }
}

// width/height come from the array, not the request: the backend's slice
// clips at the image edge.
export function dtoToSlicLabelMap(
    dto: SlicLabelMapResponseDTO,
): SlicLabelMapResult {
    return {
        bbox: {x: dto.bbox.x, y: dto.bbox.y, w: dto.width, h: dto.height},
        labelMap: {
            labels: decodeLabelMap(dto.data, dto.dtype, dto.width, dto.height),
            w: dto.width,
            h: dto.height,
            x: dto.bbox.x,
            y: dto.bbox.y,
        },
    };
}
