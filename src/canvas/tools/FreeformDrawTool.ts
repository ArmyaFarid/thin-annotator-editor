import type {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";

const MIN_POINT_DIST_SQ = 1;

export class FreeformDrawTool {
    private drawing = false;
    private points: ImageSpacePoint[] = [];
    private subtract = false;

    readonly color: string;
    readonly subtractColor: string;
    readonly strokeWidth: number;

    constructor(
        private readonly dynLayer: DynamicLayer,
        private readonly callbacks: EngineCallbacks,
        options?: {color?: string; strokeWidth?: number},
    ) {
        this.color = options?.color ?? "#f97316";
        this.subtractColor = "#EF4444";
        this.strokeWidth = options?.strokeWidth ?? 3;
    }

    setSubtractMode(v: boolean): void {
        this.subtract = v;
    }

    onMouseDown(p: ImageSpacePoint): void {
        this.drawing = true;
        this.points = [p];
        this.dynLayer.setInteractionState({
            type: "freeform-drawing",
            points: this.points,
            color: this.subtract ? this.subtractColor : this.color,
            width: this.strokeWidth,
            subtract: this.subtract,
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
            color: this.subtract ? this.subtractColor : this.color,
            width: this.strokeWidth,
            subtract: this.subtract,
        });
    }

    onMouseUp(): void {
        if (!this.drawing) return;
        this.drawing = false;
        this.dynLayer.setInteractionState({type: "idle"});

        if (this.points.length >= 2) {
            this.callbacks.onFreeformPathAdded(this.points);
        }

        this.points = [];
    }

    cancel(): void {
        this.drawing = false;
        this.points = [];
        this.dynLayer.setInteractionState({type: "idle"});
    }
}
