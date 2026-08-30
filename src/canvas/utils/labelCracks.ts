/**
 * The outline of the kept segments of a label map, as a path along the cracks
 * *between* pixels rather than over them. Stroked at a constant screen width it
 * covers no image content, unlike marking boundary pixels in a raster.
 *
 * Collinear cracks are merged into runs, so a straight edge costs one segment
 * rather than one per pixel.
 */
export function labelMapToCrackPath(
    labels: Uint16Array,
    lw: number,
    lh: number,
    kept: Uint8Array,
    originX: number,
    originY: number,
): Path2D {
    const isKept = (x: number, y: number): boolean => {
        if (x < 0 || y < 0 || x >= lw || y >= lh) {
            return false;
        }
        const id = labels[y * lw + x];
        return id !== 0 && kept[id] === 1;
    };
    const labelAt = (x: number, y: number): number => {
        if (x < 0 || y < 0 || x >= lw || y >= lh) {
            return 0;
        }
        const id = labels[y * lw + x];
        return kept[id] === 1 ? id : 0;
    };

    // vert[x][y]: the crack on the left edge of pixel (x, y), x in 0..lw.
    const vert = new Uint8Array((lw + 1) * lh);
    const horiz = new Uint8Array(lw * (lh + 1));

    for (let y = 0; y < lh; y++) {
        for (let x = 0; x <= lw; x++) {
            const a = labelAt(x - 1, y);
            const b = labelAt(x, y);
            if (a !== b && (isKept(x - 1, y) || isKept(x, y))) {
                vert[x * lh + y] = 1;
            }
        }
    }
    for (let x = 0; x < lw; x++) {
        for (let y = 0; y <= lh; y++) {
            const a = labelAt(x, y - 1);
            const b = labelAt(x, y);
            if (a !== b && (isKept(x, y - 1) || isKept(x, y))) {
                horiz[y * lw + x] = 1;
            }
        }
    }

    const path = new Path2D();
    for (let x = 0; x <= lw; x++) {
        let y = 0;
        while (y < lh) {
            if (!vert[x * lh + y]) {
                y++;
                continue;
            }
            const start = y;
            while (y < lh && vert[x * lh + y]) {
                y++;
            }
            path.moveTo(originX + x, originY + start);
            path.lineTo(originX + x, originY + y);
        }
    }
    for (let y = 0; y <= lh; y++) {
        let x = 0;
        while (x < lw) {
            if (!horiz[y * lw + x]) {
                x++;
                continue;
            }
            const start = x;
            while (x < lw && horiz[y * lw + x]) {
                x++;
            }
            path.moveTo(originX + start, originY + y);
            path.lineTo(originX + x, originY + y);
        }
    }
    return path;
}
