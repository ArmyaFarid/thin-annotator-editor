import type {AnnotationObject, Rect, RenderState, Scale} from "@/canvas/types.ts";

export class BoundingBox implements AnnotationObject {
    readonly kind = "bbox";

    constructor(
        public readonly id: number,
        public readonly x: number,
        public readonly y: number,
        public readonly w: number,
        public readonly h: number,
    ) {}

    render(ctx: CanvasRenderingContext2D, state: RenderState, scale: Scale): void {
        const dispX = this.x * scale.x;
        const dispY = this.y * scale.y;
        const dispW = this.w * scale.x;
        const dispH = this.h * scale.y;
        const lineW = 1 / Math.min(scale.x, scale.y);

        ctx.save();

        ctx.fillStyle = "rgba(79,195,247,0.15)";
        ctx.fillRect(dispX, dispY, dispW, dispH);

        ctx.strokeStyle = state === "hovered" ? "#81d4fa" : "#4FC3F7";
        ctx.lineWidth = lineW * (state === "hovered" ? 3 : 2);
        ctx.strokeRect(dispX, dispY, dispW, dispH);

        ctx.restore();
    }

    hitTest(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    getBounds(): Rect {
        return {x: this.x, y: this.y, w: this.w, h: this.h};
    }
}
