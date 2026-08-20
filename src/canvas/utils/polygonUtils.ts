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

// Direction codes: 0 = +x, 1 = +y, 2 = -x, 3 = -y. `d & 1` tells horizontal from
// vertical. Turning right is (d + 1) % 4 — clockwise on screen, where y grows down.
const CRACK_DX = [1, 0, -1, 0];
const CRACK_DY = [0, 1, 0, -1];
// The two pixels flanking a directed crack edge that starts at corner (x, y).
// The interior is kept on the right throughout, so RP must be set and LP clear.
const CRACK_RPX = [0, -1, -1, 0];
const CRACK_RPY = [0, 0, -1, -1];
const CRACK_LPX = [0, 0, -1, -1];
const CRACK_LPY = [-1, 0, 0, -1];

/**
 * Crack-following boundary tracer.
 *
 * `traceBoundary` above walks pixel CENTRES, so filling its output under-covers
 * the true pixel set by half a pixel all round. This one follows the cracks
 * BETWEEN pixels and emits pixel-CORNER coordinates, making the interior of the
 * returned rings exactly the set of "in" pixels — nothing displaced, nothing
 * approximated.
 *
 * Returns every ring in a single pass, outer boundaries and hole boundaries
 * alike. They come out wound in opposite directions, so filling the lot with the
 * even-odd rule cuts the holes out without any need to classify them.
 *
 * Vertices are emitted only where the boundary turns, so collinear runs collapse
 * losslessly: a straight 50-pixel edge costs two vertices rather than fifty-one.
 *
 * Diagonally touching pixels are treated as connected (8-connected foreground,
 * 4-connected background) — the same convention `contourExtract.ts` already uses.
 *
 * `data` is column-major (COCO RLE format): pixel (x,y) = data[x * h + y].
 */
export function traceCrackRings(data: Uint8Array, w: number, h: number): ImageSpacePoint[][] {
    // Each boundary crack is walkable in exactly one direction (reversing it puts
    // a clear pixel on the right), so marking undirected edges is enough to stop
    // a ring being traced twice.
    const hVisited = new Uint8Array(w * (h + 1));
    const vVisited = new Uint8Array((w + 1) * h);

    const filled = (x: number, y: number): boolean =>
        x >= 0 && x < w && y >= 0 && y < h && data[x * h + y] === 1;

    const isBoundary = (x: number, y: number, d: number): boolean =>
        filled(x + CRACK_RPX[d], y + CRACK_RPY[d]) &&
        !filled(x + CRACK_LPX[d], y + CRACK_LPY[d]);

    const hIndex = (x: number, y: number, d: number) => y * w + (d === 0 ? x : x - 1);
    const vIndex = (x: number, y: number, d: number) => (d === 1 ? y : y - 1) * (w + 1) + x;

    const isVisited = (x: number, y: number, d: number): boolean =>
        (d & 1) === 0 ? hVisited[hIndex(x, y, d)] === 1 : vVisited[vIndex(x, y, d)] === 1;

    const markVisited = (x: number, y: number, d: number): void => {
        if ((d & 1) === 0) {
            hVisited[hIndex(x, y, d)] = 1;
        } else {
            vVisited[vIndex(x, y, d)] = 1;
        }
    };

    const walk = (sx: number, sy: number, sd: number): ImageSpacePoint[] => {
        const ring: ImageSpacePoint[] = [];
        let x = sx, y = sy, d = sd, prevD = -1;

        for (;;) {
            if (isVisited(x, y, d)) break;
            markVisited(x, y, d);
            if (d !== prevD) ring.push({x, y});
            prevD = d;

            x += CRACK_DX[d];
            y += CRACK_DY[d];

            // Preferring the left turn is what fuses diagonally touching pixels
            // into one region; preferring the right turn would split them.
            let next = -1;
            for (const cand of [(d + 3) % 4, d, (d + 1) % 4, (d + 2) % 4]) {
                if (isBoundary(x, y, cand)) { next = cand; break; }
            }
            if (next === -1) break;
            d = next;
        }

        // The seed corner is only a real vertex if the ring actually turns there.
        if (ring.length > 1 && prevD === sd) ring.shift();
        return ring;
    };

    const rings: ImageSpacePoint[][] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[x * h + y] !== 1) continue;
            // Top, right, bottom and left cracks of this pixel, each oriented so
            // the pixel itself lies on the right.
            const seeds: [number, number, number][] = [
                [x, y, 0],
                [x + 1, y, 1],
                [x + 1, y + 1, 2],
                [x, y + 1, 3],
            ];
            for (const [sx, sy, sd] of seeds) {
                if (!isBoundary(sx, sy, sd) || isVisited(sx, sy, sd)) continue;
                const ring = walk(sx, sy, sd);
                if (ring.length >= 3) rings.push(ring);
            }
        }
    }
    return rings;
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
