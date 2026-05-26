import type {AnnotationObject, ImageSpacePoint, Rect, RenderState} from "@/canvas/types.ts";
import {theme} from "@/canvas/canvas-theme.ts";

function pointInPolygon(x: number, y: number, vertices: ImageSpacePoint[]): boolean {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class Polygon implements AnnotationObject {
    readonly kind = "polygon";

    constructor(
        public readonly id: number,
        public readonly vertices: ImageSpacePoint[],
        public readonly fillColor: string,
        public readonly strokeColor: string,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, zoom: number): void {
        if (this.vertices.length < 2) return;

        const baseWidth = theme.mask.strokeWidth;
        const extra = state === "hovered" ? theme.polygon.hoverExtraWidth : 0;
        const visualWidth = (baseWidth + extra) / zoom;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();

        ctx.strokeStyle = state === "hovered" ? theme.polygon.strokeHovered : this.strokeColor;
        ctx.lineWidth = visualWidth;
        ctx.stroke();

        if (state === "active" || state === "hovered") {
            const dotRadius = visualWidth * theme.polygon.dotRadiusFactor;
            for (const v of this.vertices) {
                ctx.beginPath();
                ctx.arc(v.x, v.y, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = this.strokeColor;
                ctx.fill();
            }
        }

        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        if (this.vertices.length >= 3 && pointInPolygon(x, y, this.vertices)) return true;
        const n = this.vertices.length;
        for (let i = 0; i < n; i++) {
            const a = this.vertices[i];
            const b = this.vertices[(i + 1) % n];
            if (distToSegment(x, y, a.x, a.y, b.x, b.y) < 6) return true;
        }
        return false;
    }

    getBounds(): Rect {
        if (this.vertices.length === 0) return {x: 0, y: 0, w: 0, h: 0};
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of this.vertices) {
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
        }
        return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    }
}
