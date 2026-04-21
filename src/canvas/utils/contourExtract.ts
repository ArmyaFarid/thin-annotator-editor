import {decode} from "@/jscocotools/mask.ts";
import {traceBoundary, douglasPeucker} from "@/canvas/utils/polygonUtils.ts";
import type {ImageSpacePoint} from "@/canvas/types.ts";
import type {RLEMask} from "@/app/atom.ts";

export const DEFAULT_CONTOUR_TOLERANCE = 2.5;
const MIN_COMPONENT_PIXELS = 10;

export interface EditableContour {
    vertices: ImageSpacePoint[];
    kind: "fill" | "hole";
}

// 8-connected neighbors (for component detection)
const N8_DX = [0, 0, 1, -1, 1, 1, -1, -1];
const N8_DY = [1, -1, 0, 0, 1, -1, 1, -1];
// 4-connected neighbors (for outer-background flood-fill)
const N4_DX = [0, 0, 1, -1];
const N4_DY = [1, -1, 0, 0];

function findConnectedComponents(data: Uint8Array, w: number, h: number): Uint8Array[] {
    const visited = new Uint8Array(w * h);
    const components: Uint8Array[] = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = x * h + y;
            if (data[idx] !== 1 || visited[idx]) continue;

            const component = new Uint8Array(w * h);
            const queue: number[] = [idx];
            let head = 0;
            visited[idx] = 1;
            let size = 0;

            while (head < queue.length) {
                const cur = queue[head++];
                component[cur] = 1;
                size++;
                const cx = Math.floor(cur / h);
                const cy = cur % h;
                for (let n = 0; n < 8; n++) {
                    const nx = cx + N8_DX[n];
                    const ny = cy + N8_DY[n];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nidx = nx * h + ny;
                        if (data[nidx] === 1 && !visited[nidx]) {
                            visited[nidx] = 1;
                            queue.push(nidx);
                        }
                    }
                }
            }

            if (size >= MIN_COMPONENT_PIXELS) {
                components.push(component);
            }
        }
    }

    return components;
}

function extractHoleContours(
    data: Uint8Array,
    w: number,
    h: number,
    tolerance: number,
): ImageSpacePoint[][] {
    // Flood-fill outer background from all border 0-pixels (4-connected)
    const outerBg = new Uint8Array(w * h);
    const queue: number[] = [];
    let head = 0;

    const seed = (x: number, y: number) => {
        const idx = x * h + y;
        if (data[idx] === 0 && !outerBg[idx]) {
            outerBg[idx] = 1;
            queue.push(idx);
        }
    };

    for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 1; y < h - 1; y++) { seed(0, y); seed(w - 1, y); }

    while (head < queue.length) {
        const cur = queue[head++];
        const cx = Math.floor(cur / h);
        const cy = cur % h;
        for (let n = 0; n < 4; n++) {
            const nx = cx + N4_DX[n];
            const ny = cy + N4_DY[n];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nidx = nx * h + ny;
                if (data[nidx] === 0 && !outerBg[nidx]) {
                    outerBg[nidx] = 1;
                    queue.push(nidx);
                }
            }
        }
    }

    // Hole pixels = foreground-enclosed 0-pixels not reachable from border
    const holeData = new Uint8Array(w * h);
    let hasHoles = false;
    for (let i = 0; i < w * h; i++) {
        if (data[i] === 0 && !outerBg[i]) {
            holeData[i] = 1;
            hasHoles = true;
        }
    }
    if (!hasHoles) return [];

    return findConnectedComponents(holeData, w, h)
        .map(comp => {
            const boundary = traceBoundary(comp, w, h);
            if (boundary.length === 0) return null;
            const simplified = douglasPeucker(boundary, tolerance);
            return simplified.length >= 3 ? simplified : null;
        })
        .filter((c): c is ImageSpacePoint[] => c !== null);
}

export function rleToEditableContours(
    rle: RLEMask,
    tolerance = DEFAULT_CONTOUR_TOLERANCE,
): EditableContour[] {
    let decoded: Uint8Array;
    try {
        const result = decode([rle]);
        decoded = result.data as Uint8Array;
    } catch {
        return [];
    }

    const [h, w] = rle.size;
    const result: EditableContour[] = [];

    // One outer contour per connected fragment
    for (const comp of findConnectedComponents(decoded, w, h)) {
        const boundary = traceBoundary(comp, w, h);
        if (boundary.length === 0) continue;
        const simplified = douglasPeucker(boundary, tolerance);
        if (simplified.length >= 3) {
            result.push({vertices: simplified, kind: "fill"});
        }
    }

    // Hole contours (inner boundaries)
    for (const vertices of extractHoleContours(decoded, w, h, tolerance)) {
        result.push({vertices, kind: "hole"});
    }

    return result;
}
