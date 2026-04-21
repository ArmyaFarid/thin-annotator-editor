import {decode} from "@/jscocotools/mask.ts";
import type {ImageSpacePoint} from "@/canvas/types.ts";

const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

// Moore neighborhood boundary tracing.
// Terminates when we return to the start pixel (simply-connected region assumption).
// `data` is column-major (COCO RLE format): pixel (x,y) = data[x * h + y].
export function traceBoundary(data: Uint8Array, w: number, h: number): ImageSpacePoint[] {
    // Find topmost-leftmost foreground pixel (scan row by row)
    let sx = -1, sy = -1;
    outer: for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[x * h + y] === 1) { sx = x; sy = y; break outer; }
        }
    }
    if (sx === -1) return [];

    const boundary: ImageSpacePoint[] = [];
    // Phantom entry: background pixel to the left → backDir = 4 (left)
    let cx = sx, cy = sy, backDir = 4;
    // Safety cap: perimeter can't meaningfully exceed twice the image perimeter
    const limit = Math.min(w * h, (w + h) * 20);

    for (let iter = 0; iter < limit; iter++) {
        boundary.push({x: cx, y: cy});

        let nx = -1, ny = -1, nd = -1;
        for (let i = 0; i < 8; i++) {
            const d = (backDir + 1 + i) % 8;
            const tx = cx + DX[d];
            const ty = cy + DY[d];
            if (tx >= 0 && tx < w && ty >= 0 && ty < h && data[tx * h + ty] === 1) {
                nx = tx; ny = ty; nd = d;
                break;
            }
        }

        if (nx === -1) break; // isolated pixel

        cx = nx; cy = ny; backDir = (nd + 4) % 8;
        if (cx === sx && cy === sy) break; // completed the loop
    }

    return boundary;
}

export function douglasPeucker(pts: ImageSpacePoint[], tolerance: number): ImageSpacePoint[] {
    if (pts.length <= 2) return pts;

    const first = pts[0], last = pts[pts.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const lenSq = dx * dx + dy * dy;

    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        let dist: number;
        if (lenSq === 0) {
            dist = Math.hypot(pts[i].x - first.x, pts[i].y - first.y);
        } else {
            const t = ((pts[i].x - first.x) * dx + (pts[i].y - first.y) * dy) / lenSq;
            const projX = first.x + t * dx;
            const projY = first.y + t * dy;
            dist = Math.hypot(pts[i].x - projX, pts[i].y - projY);
        }
        if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }

    if (maxDist > tolerance) {
        const left = douglasPeucker(pts.slice(0, maxIdx + 1), tolerance);
        const right = douglasPeucker(pts.slice(maxIdx), tolerance);
        return [...left.slice(0, -1), ...right];
    }
    return [first, last];
}

export function rleToPolygon(
    rle: {counts: string; size: [number, number]},
    tolerance = 2,
): ImageSpacePoint[] {
    let decoded: {data: Uint8Array};
    try {
        decoded = decode([rle]) as {data: Uint8Array};
    } catch {
        return [];
    }
    const [h, w] = rle.size;
    const boundary = traceBoundary(decoded.data, w, h);
    if (boundary.length === 0) return [];
    return douglasPeucker(boundary, tolerance);
}
