import {encode, DataArray} from "@/jscocotools/mask.ts";
import type {SlicSuperpixel} from "@/app/atom.ts";

// MOCK — replace with real API call
export function simulateSlic(
    bboxX: number,
    bboxY: number,
    bboxW: number,
    bboxH: number,
    imageW: number,
    imageH: number,
    numSuperpixels = 12,
): SlicSuperpixel[] {
    const bx = Math.round(bboxX);
    const by = Math.round(bboxY);
    const bw = Math.round(bboxW);
    const bh = Math.round(bboxH);

    // Generate random seed points inside bbox
    const seeds: {x: number; y: number}[] = [];
    for (let i = 0; i < numSuperpixels; i++) {
        seeds.push({
            x: bx + Math.floor(Math.random() * bw),
            y: by + Math.floor(Math.random() * bh),
        });
    }

    // Assign each pixel inside bbox to nearest seed (Voronoi)
    // labelMap[y * bw + x] = seed index (0-based)
    const labelMap = new Int16Array(bw * bh).fill(-1);
    for (let ly = 0; ly < bh; ly++) {
        const gy = by + ly;
        for (let lx = 0; lx < bw; lx++) {
            const gx = bx + lx;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let s = 0; s < seeds.length; s++) {
                const dx = gx - seeds[s].x;
                const dy = gy - seeds[s].y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = s;
                }
            }
            labelMap[ly * bw + lx] = bestIdx;
        }
    }

    // Build full-image column-major binary mask per superpixel
    const superpixels: SlicSuperpixel[] = [];
    for (let s = 0; s < seeds.length; s++) {
        const colMajor = new Uint8Array(imageW * imageH);
        for (let ly = 0; ly < bh; ly++) {
            const gy = by + ly;
            for (let lx = 0; lx < bw; lx++) {
                if (labelMap[ly * bw + lx] === s) {
                    const gx = bx + lx;
                    colMajor[gx * imageH + gy] = 1;
                }
            }
        }
        const da = new DataArray(colMajor, [imageH, imageW, 1]);
        const objs = encode(da);
        superpixels.push({
            id: s + 1,
            rle: {counts: objs[0].counts, size: [imageH, imageW]},
        });
    }

    return superpixels;
}
