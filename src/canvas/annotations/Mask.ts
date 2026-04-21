import {decode} from "@/jscocotools/mask.ts";
import type {AnnotationObject, Rect, RenderState, Scale} from "@/canvas/types.ts";
import {MASK_BORDER_DARKEN, MASK_BORDER_THICKNESS} from "@/canvas/mask-style.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";

interface Color { r: number; g: number; b: number; a: number }

export class Mask implements AnnotationObject {
    readonly kind = "mask";

    private readonly rleCanvasCache = new Map<number, HTMLCanvasElement>();
    private readonly rleDataCache = new Map<number, Uint8Array>();

    constructor(
        public readonly id: number,
        public readonly layers: MaskLayer[],
        public readonly color: Color,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, scale: Scale): void {
        ctx.save();
        if (state === "active") {
            ctx.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.85))";
        }
        for (const layer of this.layers) {
            if (layer.rleMask) {
                const src = this.getLayerCanvas(layer);
                if (!src) continue;
                const [h, w] = layer.rleMask.size;
                ctx.drawImage(src, 0, 0, w, h, 0, 0, w * scale.x, h * scale.y);
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(ctx, state, scale);
            }
        }
        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        for (const layer of this.layers) {
            if (layer.rleMask) {
                const data = this.getLayerData(layer);
                if (!data) continue;
                const [maskH, maskW] = layer.rleMask.size;
                const ix = Math.floor(x), iy = Math.floor(y);
                if (ix >= 0 && ix < maskW && iy >= 0 && iy < maskH && data[ix * maskH + iy] === 1) return true;
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                if (new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).hitTest(x, y)) return true;
            }
        }
        return false;
    }

    getBounds(): Rect {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const layer of this.layers) {
            let b: Rect;
            if (layer.rleMask) {
                const [h, w] = layer.rleMask.size;
                b = {x: 0, y: 0, w, h};
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                b = new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).getBounds();
            } else {
                continue;
            }
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.w > maxX) maxX = b.x + b.w;
            if (b.y + b.h > maxY) maxY = b.y + b.h;
        }
        if (!isFinite(minX)) return {x: 0, y: 0, w: 0, h: 0};
        return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    }

    private getLayerData(layer: MaskLayer): Uint8Array | null {
        if (this.rleDataCache.has(layer.id)) return this.rleDataCache.get(layer.id)!;
        if (!layer.rleMask) return null;
        try {
            const decoded = decode([layer.rleMask]);
            const data = decoded.data as Uint8Array;
            this.rleDataCache.set(layer.id, data);
            return data;
        } catch {
            return null;
        }
    }

    private getLayerCanvas(layer: MaskLayer): HTMLCanvasElement | null {
        if (this.rleCanvasCache.has(layer.id)) return this.rleCanvasCache.get(layer.id)!;
        if (!layer.rleMask) return null;

        const data = this.getLayerData(layer);
        if (!data) return null;

        const [maskH, maskW] = layer.rleMask.size;
        const {r, g, b, a} = this.color;
        const rgbaData = new Uint8ClampedArray(maskH * maskW * 4);
        const borderThickness = MASK_BORDER_THICKNESS;
        const darkenFactor = MASK_BORDER_DARKEN;

        for (let x = 0; x < maskW; x++) {
            for (let y = 0; y < maskH; y++) {
                const sourceIndex = x * maskH + y;
                const targetIndex = (y * maskW + x) * 4;
                if (data[sourceIndex] !== 1) continue;

                let isBorder = false;
                outer: for (let dx = -borderThickness; dx <= borderThickness; dx++) {
                    for (let dy = -borderThickness; dy <= borderThickness; dy++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= maskW || ny < 0 || ny >= maskH) { isBorder = true; break outer; }
                        if (data[nx * maskH + ny] === 0) { isBorder = true; break outer; }
                    }
                }

                if (isBorder) {
                    rgbaData[targetIndex]     = Math.max(0, r * darkenFactor);
                    rgbaData[targetIndex + 1] = Math.max(0, g * darkenFactor);
                    rgbaData[targetIndex + 2] = Math.max(0, b * darkenFactor);
                    rgbaData[targetIndex + 3] = 255;
                } else {
                    rgbaData[targetIndex]     = r;
                    rgbaData[targetIndex + 1] = g;
                    rgbaData[targetIndex + 2] = b;
                    rgbaData[targetIndex + 3] = Math.floor(a * 255);
                }
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = maskW;
        canvas.height = maskH;
        canvas.getContext("2d")!.putImageData(new ImageData(rgbaData, maskW, maskH), 0, 0);
        this.rleCanvasCache.set(layer.id, canvas);
        return canvas;
    }
}
