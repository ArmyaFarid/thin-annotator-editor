import {encode, decode, DataArray} from "@/jscocotools/mask.ts";
import type {Mask} from "@/app/atom.ts";
import type {RLEMask} from "@/app/atom.ts";

/**
 * Merges all layers of a mask into a single offscreen canvas.
 * Returns a canvas where white pixels = foreground, transparent = background.
 * Hole layers are composited with destination-out to cut out regions.
 */
export function mergeToCanvas(
    mask: Mask,
    imageW: number,
    imageH: number,
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = imageW;
    canvas.height = imageH;
    // Every caller reads this canvas straight back through canvasToRLE,
    // so keep it CPU-side rather than paying a GPU readback each time.
    const ctx = canvas.getContext("2d", {willReadFrequently: true})!;

    for (const layer of mask.layers) {
        const isHole = layer.layerKind === "hole";

        if (layer.rleMask) {
            let decoded: Uint8Array;
            try {
                const result = decode([layer.rleMask]);
                decoded = result.data as Uint8Array;
            } catch {
                continue;
            }

            const [h, w] = layer.rleMask.size;
            const rgba = new Uint8ClampedArray(w * h * 4);

            // Column-major: pixel (x, y) = decoded[x * h + y]
            for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                    if (decoded[x * h + y] === 1) {
                        const i = (y * w + x) * 4;
                        rgba[i] = 255;
                        rgba[i + 1] = 255;
                        rgba[i + 2] = 255;
                        rgba[i + 3] = 255;
                    }
                }
            }

            const tileCanvas = document.createElement("canvas");
            tileCanvas.width = w;
            tileCanvas.height = h;
            tileCanvas
                .getContext("2d")!
                .putImageData(new ImageData(rgba, w, h), 0, 0);

            ctx.save();
            ctx.globalCompositeOperation = isHole
                ? "destination-out"
                : "source-over";
            ctx.drawImage(tileCanvas, 0, 0, w, h, 0, 0, imageW, imageH);
            ctx.restore();
        } else if (layer.canvasShape) {
            const s = layer.canvasShape;
            if (s.vertices.length < 3) continue;

            ctx.save();
            ctx.globalCompositeOperation = isHole
                ? "destination-out"
                : "source-over";
            ctx.fillStyle = "rgba(255,255,255,1)";
            ctx.beginPath();
            ctx.moveTo(s.vertices[0].x, s.vertices[0].y);
            for (let i = 1; i < s.vertices.length; i++) {
                ctx.lineTo(s.vertices[i].x, s.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    return canvas;
}

/**
 * Reads a white-fg/transparent-bg canvas and returns an RLE-encoded mask.
 * Uses column-major layout required by jscocotools.
 */
export function canvasToRLE(canvas: HTMLCanvasElement): RLEMask {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data; // row-major RGBA

    // Build column-major binary array: colMajor[x * h + y]
    const colMajor = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            const alpha = pixels[(y * w + x) * 4 + 3];
            colMajor[x * h + y] = alpha > 127 ? 1 : 0;
        }
    }

    const da = new DataArray(colMajor, [h, w, 1]);
    const objs = encode(da);
    return {counts: objs[0].counts, size: [h, w]};
}
