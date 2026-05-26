import type {AnnotationObject, Rect, RenderState} from "@/canvas/types.ts";

export class Keypoint implements AnnotationObject {
    readonly kind = "keypoint";

    constructor(
        public readonly id: number,
        public readonly x: number,
        public readonly y: number,
        public readonly label: 0 | 1,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, zoom: number): void {
        const color = this.label === 1 ? "#22c55e" : "#ef4444";
        const radius = (state === "hovered" || state === "active" ? 5 : 4) / zoom;
        const lineW = 1.5 / zoom;
        const arm = 3 / zoom;

        ctx.save();

        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.label === 1 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
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
        if (this.label === 1) {
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
        return {x: this.x - 4, y: this.y - 4, w: 8, h: 8};
    }
}
