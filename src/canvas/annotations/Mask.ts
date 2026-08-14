import {decode} from "@/jscocotools/mask.ts";
import type {AnnotationObject, Rect, RenderState} from "@/canvas/types.ts";
import {theme} from "@/canvas/canvas-theme.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";

interface Color { r: number; g: number; b: number; a: number }

export class Mask implements AnnotationObject {
    readonly kind = "mask";

    private readonly rleDataCache = new Map<number, Uint8Array>();
    private readonly rleAlphaCache = new Map<number, HTMLCanvasElement>();
    private compositeCache: HTMLCanvasElement | null = null;
    private compositeKey = "";
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

        // Resolve the natural-image dimensions used as the compositing space.
        let natW = naturalSize?.w ?? 0;
        let natH = naturalSize?.h ?? 0;
        if (!natW || !natH) {
            for (const layer of this.layers) {
                if (layer.rleMask) {
                    const [h, w] = layer.rleMask.size;
                    if (w > natW) natW = w;
                    if (h > natH) natH = h;
                } else if (layer.canvasShape) {
                    for (const v of layer.canvasShape.vertices) {
                        if (v.x > natW) natW = Math.ceil(v.x);
                        if (v.y > natH) natH = Math.ceil(v.y);
                    }
                }
            }
        }
        if (!natW || !natH) return;

        // Composite all layers (fill ∪, hole ∖) into one union mask, then draw a
        // single border around that union so added layers merge seamlessly
        // instead of each layer showing its own outline.
        const composite = this.getCompositeCanvas(natW, natH);
        if (!composite) return;

        ctx.save();
        if (state === "active") {
            ctx.filter = theme.mask.activeShadow;
        }
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(composite, 0, 0, natW, natH, 0, 0, natW, natH);
        // Hover glow: re-blit the same cached composite additively. No geometry
        // work and the composite cache key is untouched, so hovering never
        // triggers the expensive per-pixel border pass.
        if (state === "hovered") {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = theme.mask.hoverGlowAlpha;
            ctx.drawImage(composite, 0, 0, natW, natH, 0, 0, natW, natH);
        }
        ctx.imageSmoothingEnabled = prevSmoothing;
        ctx.restore();
    }

    // Build (and cache) the colored mask canvas at natural size. All layers are
    // first composited into a single binary union (fill via source-over, hole
    // via destination-out), then a border is computed once over that union.
    private getCompositeCanvas(natW: number, natH: number): HTMLCanvasElement | null {
        const key = `${natW}x${natH}:${this.borderOnly}`;
        if (this.compositeCache && this.compositeKey === key) return this.compositeCache;
        this.compositeKey = key;

        const occ = document.createElement("canvas");
        occ.width = natW;
        occ.height = natH;
        const oCtx = occ.getContext("2d")!;
        oCtx.imageSmoothingEnabled = false;

        let any = false;
        for (const layer of this.layers) {
            const isHole = layer.layerKind === "hole";
            if (layer.rleMask) {
                const alpha = this.getLayerAlphaCanvas(layer);
                if (!alpha) continue;
                const [h, w] = layer.rleMask.size;
                oCtx.save();
                oCtx.globalCompositeOperation = isHole ? "destination-out" : "source-over";
                oCtx.drawImage(alpha, 0, 0, w, h, 0, 0, natW, natH);
                oCtx.restore();
                any = true;
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                if (s.vertices.length < 3) continue;
                oCtx.save();
                oCtx.globalCompositeOperation = isHole ? "destination-out" : "source-over";
                oCtx.fillStyle = "rgba(255,255,255,1)";
                oCtx.beginPath();
                oCtx.moveTo(s.vertices[0].x, s.vertices[0].y);
                for (let i = 1; i < s.vertices.length; i++) {
                    oCtx.lineTo(s.vertices[i].x, s.vertices[i].y);
                }
                oCtx.closePath();
                oCtx.fill();
                oCtx.restore();
                any = true;
            }
        }
        if (!any) {
            this.compositeCache = null;
            return null;
        }

        const occData = oCtx.getImageData(0, 0, natW, natH).data;
        const out = new Uint8ClampedArray(natW * natH * 4);
        const {r, g, b, a} = this.color;
        const bt = theme.mask.borderThickness;
        const df = theme.mask.borderDarken;
        const occupied = (x: number, y: number) => occData[(y * natW + x) * 4 + 3] > 127;

        for (let y = 0; y < natH; y++) {
            for (let x = 0; x < natW; x++) {
                if (!occupied(x, y)) continue;

                let isBorder = false;
                outer: for (let dx = -bt; dx <= bt; dx++) {
                    for (let dy = -bt; dy <= bt; dy++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= natW || ny < 0 || ny >= natH) { isBorder = true; break outer; }
                        if (!occupied(nx, ny)) { isBorder = true; break outer; }
                    }
                }

                const ti = (y * natW + x) * 4;
                if (isBorder) {
                    out[ti]     = Math.max(0, r * df);
                    out[ti + 1] = Math.max(0, g * df);
                    out[ti + 2] = Math.max(0, b * df);
                    out[ti + 3] = 255;
                } else if (!this.borderOnly) {
                    out[ti]     = r;
                    out[ti + 1] = g;
                    out[ti + 2] = b;
                    out[ti + 3] = Math.floor(a * 255);
                }
            }
        }

        const colored = document.createElement("canvas");
        colored.width = natW;
        colored.height = natH;
        colored.getContext("2d")!.putImageData(new ImageData(out, natW, natH), 0, 0);
        this.compositeCache = colored;
        return colored;
    }

    private renderSkeleton(ctx: CanvasRenderingContext2D, zoom: number): void {
        const {r, g, b} = this.color;
        const stroke = theme.mask.skeletonStrokeWidth / zoom;
        const [dashA, dashB] = theme.mask.skeletonHoleDash;
        ctx.save();
        ctx.filter = theme.mask.activeShadow;

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
                ctx.lineWidth = stroke;
                ctx.stroke();
            } else {
                ctx.strokeStyle = theme.mask.skeletonHoleStroke;
                ctx.lineWidth = stroke;
                ctx.setLineDash([dashA / zoom, dashB / zoom]);
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
