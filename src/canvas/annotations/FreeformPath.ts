import type {AnnotationObject, ImageSpacePoint, Rect, RenderState} from "@/canvas/types.ts";
import {theme} from "@/canvas/canvas-theme.ts";

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class FreeformPath implements AnnotationObject {
    readonly kind = "freeform";

    constructor(
        public readonly id: number,
        public readonly points: ImageSpacePoint[],
        public readonly color: string,
        public readonly strokeWidth: number,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, zoom: number): void {
        if (this.points.length < 2) return;

        const baseWidth = theme.mask.strokeWidth;
        const extra = state === "hovered" ? theme.freeform.hoverExtraWidth : 0;
        const visualWidth = (baseWidth + extra) / zoom;

        ctx.save();
        ctx.beginPath();

        const first = this.points[0];
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.points.length - 1; i++) {
            const curr = this.points[i];
            const next = this.points[i + 1];
            const cpX = (curr.x + next.x) / 2;
            const cpY = (curr.y + next.y) / 2;
            ctx.quadraticCurveTo(curr.x, curr.y, cpX, cpY);
        }

        const last = this.points[this.points.length - 1];
        ctx.lineTo(last.x, last.y);

        ctx.strokeStyle = state === "hovered" ? theme.polygon.strokeHovered : this.color;
        ctx.lineWidth = visualWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        const threshold = this.strokeWidth / 2 + 4;
        for (let i = 0; i < this.points.length - 1; i++) {
            const a = this.points[i];
            const b = this.points[i + 1];
            if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= threshold) return true;
        }
        return false;
    }

    getBounds(): Rect {
        if (this.points.length === 0) return {x: 0, y: 0, w: 0, h: 0};
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of this.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    }
}
