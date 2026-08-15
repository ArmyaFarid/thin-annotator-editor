import type {Mask, MaskLayer, RLEMask} from "@/app/atom.ts";
import {
    PROJECT_FORMAT_VERSION,
    type MaskDTO,
    type MaskLayerDTO,
    type RLEDTO,
} from "@/lib/services/api/project/dto.ts";
import Logger from "@/common/logger/Logger.ts";

// Validation lives here because 21 files consume the Mask shape: a payload that
// slips through surfaces as `undefined` inside the canvas renderer — a blank
// image with no error — rather than as a failed load.

function isRle(v: unknown): v is RLEDTO {
    const r = v as RLEDTO;
    return (
        typeof r?.counts === "string" &&
        Array.isArray(r.size) &&
        r.size.length === 2 &&
        r.size.every((n) => typeof n === "number")
    );
}

function isLayer(v: unknown): v is MaskLayerDTO {
    const l = v as MaskLayerDTO;
    if (typeof l?.id !== "number") return false;
    if (l.rleMask !== undefined && !isRle(l.rleMask)) return false;
    if (l.canvasShape !== undefined) {
        const s = l.canvasShape;
        if (s?.kind !== "polygon" || !Array.isArray(s.vertices)) return false;
        if (!s.vertices.every((p) => typeof p?.x === "number" && typeof p?.y === "number")) {
            return false;
        }
    }
    // A layer with neither payload draws nothing and is treated as corrupt.
    return l.rleMask !== undefined || l.canvasShape !== undefined;
}

function isMask(v: unknown): v is MaskDTO {
    const m = v as MaskDTO;
    const c = m?.color;
    return (
        typeof m?.id === "number" &&
        typeof m.label === "string" &&
        Array.isArray(m.layers) &&
        m.layers.every(isLayer) &&
        typeof c?.r === "number" &&
        typeof c?.g === "number" &&
        typeof c?.b === "number" &&
        typeof c?.a === "number"
    );
}

/**
 * Parse whatever the backend or localStorage returned into domain masks.
 * Malformed entries are dropped with a warning instead of poisoning the canvas.
 * Accepts v0 (no version field) unchanged — the shapes are identical today, and
 * this is the seam where they stop being.
 */
export function dtoToMasks(raw: unknown): Mask[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const kept: Mask[] = [];
    let dropped = 0;
    for (const entry of raw) {
        if (!isMask(entry)) {
            dropped++;
            continue;
        }
        kept.push({
            id: entry.id,
            label: entry.label,
            layers: entry.layers as MaskLayer[],
            point_labels: Array.isArray(entry.point_labels) ? entry.point_labels : [],
            point_coords: Array.isArray(entry.point_coords) ? entry.point_coords : [],
            color: entry.color,
            annotation: entry.annotation as Mask["annotation"],
        });
    }
    if (dropped > 0) {
        Logger.warn(
            `[project] dropped ${dropped} malformed mask(s) while loading — saved file may be from an incompatible version`,
        );
    }
    return kept;
}

export function masksToDto(masks: Mask[]): MaskDTO[] {
    return masks.map((m) => ({
        id: m.id,
        label: m.label,
        layers: m.layers.map((l) => ({
            id: l.id,
            source: l.source,
            rleMask: l.rleMask as RLEMask | undefined,
            canvasShape: l.canvasShape,
            layerKind: l.layerKind,
        })),
        point_labels: m.point_labels,
        point_coords: m.point_coords,
        color: m.color,
        annotation: m.annotation,
    }));
}

export {PROJECT_FORMAT_VERSION};
