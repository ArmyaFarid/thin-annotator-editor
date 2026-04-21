import type {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";

const MIN_POINT_DIST_SQ = 1;

export class FreeformDrawTool {
    private drawing = false;
    private points: ImageSpacePoint[] = [];

    readonly color: string;
    readonly strokeWidth: number;

    constructor(
        private readonly dynLayer: DynamicLayer,
        private readonly callbacks: EngineCallbacks,
        options?: {color?: string; strokeWidth?: number},
    ) {
        this.color = options?.color ?? "#f97316";
        this.strokeWidth = options?.strokeWidth ?? 3;
    }

    onMouseDown(p: ImageSpacePoint): void {
        this.drawing = true;
        this.points = [p];
        this.dynLayer.setInteractionState({
            type: "freeform-drawing",
            points: this.points,
            color: this.color,
            width: this.strokeWidth,
        });
    }

    onMouseMove(p: ImageSpacePoint): void {
        if (!this.drawing) return;

        const last = this.points[this.points.length - 1];
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        if (dx * dx + dy * dy < MIN_POINT_DIST_SQ) return;

        this.points = [...this.points, p];
        this.dynLayer.setInteractionState({
            type: "freeform-drawing",
            points: this.points,
            color: this.color,
            width: this.strokeWidth,
        });
    }

    onMouseUp(): void {
        if (!this.drawing) return;
        this.drawing = false;
        this.dynLayer.setInteractionState({type: "idle"});

        if (this.points.length >= 2) {
            this.callbacks.onFreeformPathAdded(this.points, this.color, this.strokeWidth);
        }

        this.points = [];
    }

    cancel(): void {
        this.drawing = false;
        this.points = [];
        this.dynLayer.setInteractionState({type: "idle"});
    }
}
