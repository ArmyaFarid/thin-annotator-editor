import type {AnnotationObject, Rect, RenderState, Scale} from "@/canvas/types.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {Polygon} from "@/canvas/annotations/Polygon.ts";

interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

export class Mask implements AnnotationObject {
    readonly kind = "mask";

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
            const s = layer.canvasShape;
            new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).render(ctx, state, scale);
        }
        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        for (const layer of this.layers) {
            const s = layer.canvasShape;
            if (new Polygon(s.id, s.vertices, s.fillColor, s.strokeColor).hitTest(x, y)) return true;
        }
        return false;
    }

    getBounds(): Rect {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const layer of this.layers) {
            const b = new Polygon(
                layer.canvasShape.id,
                layer.canvasShape.vertices,
                layer.canvasShape.fillColor,
                layer.canvasShape.strokeColor,
            ).getBounds();
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.w > maxX) maxX = b.x + b.w;
            if (b.y + b.h > maxY) maxY = b.y + b.h;
        }
        if (!isFinite(minX)) return {x: 0, y: 0, w: 0, h: 0};
        return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    }
}
