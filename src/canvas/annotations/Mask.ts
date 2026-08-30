import {decode, toBbox} from "@/jscocotools/mask.ts";
import type {AnnotationObject, ImageSpacePoint, Rect, RenderState} from "@/canvas/types.ts";
import {theme} from "@/canvas/canvas-theme.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";
import {traceCrackRings} from "@/canvas/utils/polygonUtils.ts";

interface Color { r: number; g: number; b: number; a: number }

interface OccupancyBox { bx: number; by: number; bw: number; bh: number }

function signedArea(pts: ImageSpacePoint[]): number {
    let sum = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        sum += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    return sum;
}

export class Mask implements AnnotationObject {
    readonly kind = "mask";

    private readonly rleDataCache = new Map<number, Uint8Array>();
    private contourCache: Path2D | null = null;
    private contourKey = "";
    private borderOnly = false;

    setBorderOnly(b: boolean): void {
        this.borderOnly = b;
    }

    constructor(
        public readonly id: number,
        public readonly layers: MaskLayer[],
        public readonly color: Color,
    ) {}

    // Standard AnnotationObject.render delegates to renderWithNatural, which
    // falls back to the layers' own extents when no natural size is supplied.
    // DataLayer passes the real image size so the fallback is never needed.
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

        // Resolve the natural-image dimensions the contour is expressed in.
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

        const path = this.getContourPath(natW, natH);
        if (!path) return;

        const {r, g, b, a} = this.color;
        const df = theme.mask.borderDarken;
        const extra = state === "hovered" ? theme.polygon.hoverExtraWidth : 0;

        ctx.save();
        if (state === "active") {
            ctx.filter = theme.mask.activeShadow;
        }
        if (!this.borderOnly) {
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fill(path, "nonzero");
        }
        // The old raster border only ever marked occupied pixels, so a mask's
        // visual extent equalled its true extent. A centred stroke would put half
        // its width outside — five image pixels of inflation at 0.25x zoom, enough
        // to make neighbouring grains look like they overlap. Clip first, then
        // stroke at double width so only the inner half survives.
        ctx.clip(path, "nonzero");
        ctx.lineWidth = (2 * (theme.mask.strokeWidth + extra)) / zoom;
        ctx.strokeStyle = state === "hovered"
            ? theme.polygon.strokeHovered
            : `rgb(${Math.max(0, r * df)},${Math.max(0, g * df)},${Math.max(0, b * df)})`;
        ctx.stroke(path);
        ctx.restore();
    }

    // Vector geometry for the whole mask, cached until the layers change.
    // Outer rings are wound positive and holes negative, so filling the lot with
    // the nonzero rule reproduces the old fill ∪ / hole ∖ compositing — unioning
    // overlapping fills instead of XOR-ing them, which is what even-odd would do.
    private getContourPath(natW: number, natH: number): Path2D | null {
        const key = `${natW}x${natH}`;
        if (this.contourCache && this.contourKey === key) return this.contourCache;
        this.contourKey = key;

        const rings = this.vectorRings() ?? this.tracedRings(natW, natH);
        if (rings.length === 0) {
            this.contourCache = null;
            return null;
        }

        const path = new Path2D();
        for (const ring of rings) {
            path.moveTo(ring[0].x, ring[0].y);
            for (let i = 1; i < ring.length; i++) {
                path.lineTo(ring[i].x, ring[i].y);
            }
            path.closePath();
        }
        this.contourCache = path;
        return path;
    }

    // Masks made purely of drawn polygons keep their exact vertices — rasterizing
    // them only to trace the result back would quantize a shape that was never
    // pixel-bound in the first place.
    private vectorRings(): ImageSpacePoint[][] | null {
        if (this.layers.length === 0) return null;
        if (!this.layers.every(l => l.canvasShape && !l.rleMask)) return null;
        // Holes alone wind to a non-zero total and would fill, where the old
        // destination-out compositing drew nothing.
        if (!this.layers.some(l => l.layerKind !== "hole")) return null;

        const rings: ImageSpacePoint[][] = [];
        for (const layer of this.layers) {
            const s = layer.canvasShape!;
            if (s.vertices.length < 3) continue;
            const wantPositive = layer.layerKind !== "hole";
            const isPositive = signedArea(s.vertices) >= 0;
            rings.push(isPositive === wantPositive ? s.vertices : [...s.vertices].reverse());
        }
        return rings.length > 0 ? rings : null;
    }

    // Composite the layers into a binary grid and trace its cracks. The grid is
    // cropped to the mask's own bounds: a grain occupies a small fraction of the
    // plate, and both the allocation and the trace scale with the crop, not with
    // the image.
    private tracedRings(natW: number, natH: number): ImageSpacePoint[][] {
        const box = this.occupancyBounds(natW, natH);
        if (!box) return [];

        const {bx, by, bw, bh} = box;
        const occ = new Uint8Array(bw * bh);

        for (const layer of this.layers) {
            const value = layer.layerKind === "hole" ? 0 : 1;
            if (layer.rleMask) {
                const data = this.getLayerData(layer);
                if (!data) continue;
                const [lh, lw] = layer.rleMask.size;
                for (let x = 0; x < bw; x++) {
                    const srcX = lw === natW
                        ? bx + x
                        : Math.min(lw - 1, Math.floor(((bx + x) * lw) / natW));
                    for (let y = 0; y < bh; y++) {
                        const srcY = lh === natH
                            ? by + y
                            : Math.min(lh - 1, Math.floor(((by + y) * lh) / natH));
                        if (data[srcX * lh + srcY] === 1) occ[x * bh + y] = value;
                    }
                }
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                if (s.vertices.length < 3) continue;
                const scratch = document.createElement("canvas");
                scratch.width = bw;
                scratch.height = bh;
                const sCtx = scratch.getContext("2d")!;
                sCtx.translate(-bx, -by);
                sCtx.beginPath();
                sCtx.moveTo(s.vertices[0].x, s.vertices[0].y);
                for (let i = 1; i < s.vertices.length; i++) {
                    sCtx.lineTo(s.vertices[i].x, s.vertices[i].y);
                }
                sCtx.closePath();
                sCtx.fill();
                const pixels = sCtx.getImageData(0, 0, bw, bh).data;
                for (let y = 0; y < bh; y++) {
                    for (let x = 0; x < bw; x++) {
                        if (pixels[(y * bw + x) * 4 + 3] > 127) occ[x * bh + y] = value;
                    }
                }
            }
        }

        return traceCrackRings(occ, bw, bh).map(ring =>
            ring.map(p => ({x: p.x + bx, y: p.y + by})),
        );
    }

    // Bounds of the mask's fill layers in natural-image space. Hole layers can
    // only remove pixels, so they never widen the box.
    private occupancyBounds(natW: number, natH: number): OccupancyBox | null {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const layer of this.layers) {
            if (layer.layerKind === "hole") continue;

            if (layer.rleMask) {
                // toBbox walks the runs rather than the pixels, so this stays
                // cheap on a 12 MP plate where decoding would not.
                const [lx, ly, lbw, lbh] = toBbox([layer.rleMask]);
                if (lbw <= 0 || lbh <= 0) continue;
                const [lh, lw] = layer.rleMask.size;
                const sx = natW / lw, sy = natH / lh;
                minX = Math.min(minX, Math.floor(lx * sx));
                maxX = Math.max(maxX, Math.ceil((lx + lbw) * sx) - 1);
                minY = Math.min(minY, Math.floor(ly * sy));
                maxY = Math.max(maxY, Math.ceil((ly + lbh) * sy) - 1);
            } else if (layer.canvasShape) {
                const s = layer.canvasShape;
                if (s.vertices.length < 3) continue;
                for (const v of s.vertices) {
                    minX = Math.min(minX, Math.floor(v.x));
                    maxX = Math.max(maxX, Math.ceil(v.x));
                    minY = Math.min(minY, Math.floor(v.y));
                    maxY = Math.max(maxY, Math.ceil(v.y));
                }
            }
        }

        if (maxX < minX || maxY < minY) return null;
        const bx = Math.max(0, minX);
        const by = Math.max(0, minY);
        const bw = Math.min(natW - 1, maxX) - bx + 1;
        const bh = Math.min(natH - 1, maxY) - by + 1;
        return bw > 0 && bh > 0 ? {bx, by, bw, bh} : null;
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

}
