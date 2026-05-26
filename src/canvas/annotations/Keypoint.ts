import type {AnnotationObject, Rect, RenderState} from "@/canvas/types.ts";
import {theme} from "@/canvas/canvas-theme.ts";

export class Keypoint implements AnnotationObject {
    readonly kind = "keypoint";

    constructor(
        public readonly id: number,
        public readonly x: number,
        public readonly y: number,
        public readonly label: 0 | 1,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, zoom: number): void {
        const isPositive = this.label === 1;
        const color = isPositive ? theme.keypoint.positive : theme.keypoint.negative;
        const fill = isPositive
            ? theme.keypoint.positiveFill
            : theme.keypoint.negativeFill;
        const isHighlighted = state === "hovered" || state === "active";
        const radius =
            (isHighlighted ? theme.keypoint.radiusActive : theme.keypoint.radius) /
            zoom;
        const lineW = theme.keypoint.lineWidth / zoom;
        const arm = theme.keypoint.arm / zoom;

        ctx.save();

        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.stroke();

        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.x - arm, this.y);
        ctx.lineTo(this.x + arm, this.y);
        if (isPositive) {
            ctx.moveTo(this.x, this.y - arm);
            ctx.lineTo(this.x, this.y + arm);
        }
        ctx.stroke();

        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= 25;
    }

    getBounds(): Rect {
        return {
            x: this.x - theme.keypoint.radius,
            y: this.y - theme.keypoint.radius,
            w: theme.keypoint.radius * 2,
            h: theme.keypoint.radius * 2,
        };
    }
}
