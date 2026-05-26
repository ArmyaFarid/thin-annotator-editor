import {decode} from "@/jscocotools/mask.ts";
import type {AnnotationObject, Rect, RenderState} from "@/canvas/types.ts";
import {MASK_BORDER_DARKEN, MASK_BORDER_THICKNESS} from "@/canvas/mask-style.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";

interface Color { r: number; g: number; b: number; a: number }

export class Mask implements AnnotationObject {
    readonly kind = "mask";

    private readonly rleCanvasCache = new Map<number, HTMLCanvasElement>();
    private readonly rleBorderOnlyCache = new Map<number, HTMLCanvasElement>();
    private readonly rleDataCache = new Map<number, Uint8Array>();
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

    // Standard AnnotationObject.render delegates to renderWithNatural with no
    // natural size — only the no-hole fast path is used. Use renderWithNatural
    // directly from DataLayer when natural image size is known.
    render(ctx: CanvasRenderingContext2D, state: RenderState, zoom: number): void {
        this.renderWithNatural(ctx, state, zoom, null);
    }

    renderWithNatural(
        ctx: CanvasRenderingContext2D,
        state: RenderState,
        zoom: number,
        naturalSize: {w: number; h: number} | null,
    ): void {
        const isSkeletonMode = state === "active" && this.layers.length > 0
            && this.layers.every(l => l.canvasShape && !l.rleMask);
        if (isSkeletonMode) {
            this.renderSkeleton(ctx, zoom);
            return;
        }

        const hasHole = this.layers.some(l => l.layerKind === "hole");

        if (!hasHole) {
            ctx.save();
            if (state === "active") {
                ctx.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.85))";
            }
            const prevSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            for (const layer of this.layers) {
                if (layer.rleMask) {
                    const src = this.getLayerCanvas(layer);
                    if (!src) continue;
                    const [h, w] = layer.rleMask.size;
                    ctx.drawImage(src, 0, 0, w, h, 0, 0, w, h);
                } else if (layer.canvasShape) {
                    const s = layer.canvasShape;
                    new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(ctx, state, zoom);
                }
            }
            ctx.imageSmoothingEnabled = prevSmoothing;
            ctx.restore();
            return;
        }

        // Hole compositing: render layers onto an image-natural-size offscreen
        // so destination-out works at the data's resolution, then drawImage it
        // back at image-space coords (the main ctx has the view transform).
        const natW = naturalSize?.w ?? 1;
        const natH = naturalSize?.h ?? 1;
        const off = document.createElement("canvas");
        off.width = natW;
        off.height = natH;
        const offCtx = off.getContext("2d")!;
        offCtx.imageSmoothingEnabled = false;

        for (const layer of this.layers) {
            const isHole = layer.layerKind === "hole";

            if (isHole) {
                if (layer.rleMask) {
                    const alphaCanvas = this.getLayerAlphaCanvas(layer);
                    if (alphaCanvas) {
                        const [h, w] = layer.rleMask.size;
                        offCtx.save();
                        offCtx.globalCompositeOperation = "destination-out";
                        offCtx.drawImage(alphaCanvas, 0, 0, w, h, 0, 0, w, h);
                        offCtx.restore();
                    }
                } else if (layer.canvasShape) {
                    const s = layer.canvasShape;
                    if (s.vertices.length >= 3) {
                        offCtx.save();
                        offCtx.globalCompositeOperation = "destination-out";
                        offCtx.fillStyle = "rgba(255,255,255,1)";
                        offCtx.beginPath();
                        offCtx.moveTo(s.vertices[0].x, s.vertices[0].y);
                        for (let i = 1; i < s.vertices.length; i++) {
                            offCtx.lineTo(s.vertices[i].x, s.vertices[i].y);
                        }
                        offCtx.closePath();
                        offCtx.fill();
                        offCtx.restore();
                    }
                }
            } else {
                if (layer.rleMask) {
                    const src = this.getLayerCanvas(layer);
                    if (src) {
                        const [h, w] = layer.rleMask.size;
                        offCtx.drawImage(src, 0, 0, w, h, 0, 0, w, h);
                    }
                } else if (layer.canvasShape) {
                    const s = layer.canvasShape;
                    new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(offCtx, state, zoom);
                }
            }
        }

        ctx.save();
        if (state === "active") {
            ctx.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.85))";
        }
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, natW, natH, 0, 0, natW, natH);
        ctx.imageSmoothingEnabled = prevSmoothing;
        ctx.restore();
    }

    private renderSkeleton(ctx: CanvasRenderingContext2D, zoom: number): void {
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
            ctx.moveTo(s.vertices[0].x, s.vertices[0].y);
            for (let i = 1; i < s.vertices.length; i++) {
                ctx.lineTo(s.vertices[i].x, s.vertices[i].y);
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
