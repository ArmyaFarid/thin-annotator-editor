import {decode} from "@/jscocotools/mask.ts";
import type {AnnotationObject, Rect, RenderState, Scale} from "@/canvas/types.ts";
import {MASK_BORDER_DARKEN, MASK_BORDER_THICKNESS} from "@/canvas/mask-style.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";

interface Color { r: number; g: number; b: number; a: number }

export class Mask implements AnnotationObject {
    readonly kind = "mask";

    private readonly rleCanvasCache = new Map<number, HTMLCanvasElement>();
    private readonly rleBorderOnlyCache = new Map<number, HTMLCanvasElement>();
    private readonly rleDataCache = new Map<number, Uint8Array>();
    // Separate cache for alpha-only shape canvases used by hole compositing
    private readonly rleAlphaCache = new Map<number, HTMLCanvasElement>();
    private borderOnly = false;

    setBorderOnly(b: boolean): void {
        this.borderOnly = b;
    }

    constructor(
        public readonly id: number,
        public readonly layers: MaskLayer[],
        public readonly color: Color,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, scale: Scale, zoom: number): void {
        // Skeleton mode: active mask whose layers are all polygons (post-contour-extraction)
        const isSkeletonMode = state === "active" && this.layers.length > 0
            && this.layers.every(l => l.canvasShape && !l.rleMask);
        if (isSkeletonMode) {
            this.renderSkeleton(ctx, scale, zoom);
            return;
        }

        const hasHole = this.layers.some(l => l.layerKind === "hole");

        if (!hasHole) {
            // Fast path: no holes, draw layers directly as before
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
                    new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(ctx, state, scale, zoom);
                }
            }
            ctx.restore();
            return;
        }

        // Hole path: composite layers onto an offscreen canvas to handle destination-out correctly
        const offW = ctx.canvas.width;
        const offH = ctx.canvas.height;
        const off = document.createElement("canvas");
        off.width = offW;
        off.height = offH;
        const offCtx = off.getContext("2d")!;

        for (const layer of this.layers) {
            const isHole = layer.layerKind === "hole";

            if (isHole) {
                // For holes we need an alpha-only shape to use destination-out
                if (layer.rleMask) {
                    const alphaCanvas = this.getLayerAlphaCanvas(layer);
                    if (alphaCanvas) {
                        const [h, w] = layer.rleMask.size;
                        offCtx.save();
                        offCtx.globalCompositeOperation = "destination-out";
                        offCtx.drawImage(alphaCanvas, 0, 0, w, h, 0, 0, w * scale.x, h * scale.y);
                        offCtx.restore();
                    }
                } else if (layer.canvasShape) {
                    const s = layer.canvasShape;
                    if (s.vertices.length >= 3) {
                        offCtx.save();
                        offCtx.globalCompositeOperation = "destination-out";
                        offCtx.fillStyle = "rgba(255,255,255,1)";
                        offCtx.beginPath();
                        offCtx.moveTo(s.vertices[0].x * scale.x, s.vertices[0].y * scale.y);
                        for (let i = 1; i < s.vertices.length; i++) {
                            offCtx.lineTo(s.vertices[i].x * scale.x, s.vertices[i].y * scale.y);
                        }
                        offCtx.closePath();
                        offCtx.fill();
                        offCtx.restore();
                    }
                }
            } else {
                // Normal fill layer
                if (layer.rleMask) {
                    const src = this.getLayerCanvas(layer);
                    if (src) {
                        const [h, w] = layer.rleMask.size;
                        offCtx.drawImage(src, 0, 0, w, h, 0, 0, w * scale.x, h * scale.y);
                    }
                } else if (layer.canvasShape) {
                    const s = layer.canvasShape;
                    new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(offCtx, state, scale, zoom);
                }
            }
        }

        ctx.save();
        if (state === "active") {
            ctx.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.85))";
        }
        ctx.drawImage(off, 0, 0);
        ctx.restore();
    }

    private renderSkeleton(ctx: CanvasRenderingContext2D, scale: Scale, zoom: number): void {
        const {r, g, b} = this.color;
        ctx.save();
        ctx.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.7))";

        for (const layer of this.layers) {
            if (!layer.canvasShape || layer.canvasShape.kind !== "polygon") continue;
            const s = layer.canvasShape;
            if (s.vertices.length < 3) continue;
            const isHole = layer.layerKind === "hole";

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.vertices[0].x * scale.x, s.vertices[0].y * scale.y);
            for (let i = 1; i < s.vertices.length; i++) {
                ctx.lineTo(s.vertices[i].x * scale.x, s.vertices[i].y * scale.y);
            }
            ctx.closePath();

            if (!isHole) {
                ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
                ctx.fill();
                ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
                ctx.lineWidth = 1.5 / zoom;
                ctx.stroke();
            } else {
                ctx.strokeStyle = "rgba(255,140,50,0.9)";
                ctx.lineWidth = 1.5 / zoom;
                ctx.setLineDash([5 / zoom, 3 / zoom]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
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
        const cache = this.borderOnly ? this.rleBorderOnlyCache : this.rleCanvasCache;
        if (cache.has(layer.id)) return cache.get(layer.id)!;
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
                } else if (!this.borderOnly) {
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
        cache.set(layer.id, canvas);
        return canvas;
    }

    /**
     * Returns a white-on-transparent canvas for use with destination-out compositing.
     * Only needed for hole layers.
     */
    private getLayerAlphaCanvas(layer: MaskLayer): HTMLCanvasElement | null {
        if (this.rleAlphaCache.has(layer.id)) return this.rleAlphaCache.get(layer.id)!;
        if (!layer.rleMask) return null;

        const data = this.getLayerData(layer);
        if (!data) return null;

        const [maskH, maskW] = layer.rleMask.size;
        const rgba = new Uint8ClampedArray(maskW * maskH * 4);

        for (let x = 0; x < maskW; x++) {
            for (let y = 0; y < maskH; y++) {
                if (data[x * maskH + y] === 1) {
                    const i = (y * maskW + x) * 4;
                    rgba[i] = 255;
                    rgba[i + 1] = 255;
                    rgba[i + 2] = 255;
                    rgba[i + 3] = 255;
                }
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = maskW;
        canvas.height = maskH;
        canvas.getContext("2d")!.putImageData(new ImageData(rgba, maskW, maskH), 0, 0);
        this.rleAlphaCache.set(layer.id, canvas);
        return canvas;
    }
}
