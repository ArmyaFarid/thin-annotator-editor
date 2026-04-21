import type {AnnotationObject, Rect, RenderState, Scale} from "@/canvas/types.ts";

export class Keypoint implements AnnotationObject {
    readonly kind = "keypoint";

    constructor(
        public readonly id: number,
        public readonly x: number,
        public readonly y: number,
        public readonly label: 0 | 1,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, scale: Scale): void {
        const dispX = this.x * scale.x;
        const dispY = this.y * scale.y;
        const color = this.label === 1 ? "#22c55e" : "#ef4444";
        const radius = state === "hovered" || state === "active" ? 5 : 4;

        ctx.save();

        ctx.beginPath();
        ctx.arc(dispX, dispY, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.label === 1 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(dispX - 3, dispY);
        ctx.lineTo(dispX + 3, dispY);
        if (this.label === 1) {
            ctx.moveTo(dispX, dispY - 3);
            ctx.lineTo(dispX, dispY + 3);
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
